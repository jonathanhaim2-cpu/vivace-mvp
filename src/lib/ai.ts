import { CHART_OF_ACCOUNTS, isChartLeafId } from "@/lib/chart-of-accounts";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export type AiSuggestion = {
  supplierName: string | null;
  invoiceDate: string | null;
  totalIls: number | null;
  accountId: string | null;
  confidence: number;
  reason: string;
};

export type AiRuntime = {
  available: boolean;
  provider: "google" | "openai" | null;
  reason: "ok" | "no_key" | "budget";
  calls: number;
  estimatedUsd: number;
  budgetUsd: number | null;
  month: string;
};

const LOW = 0.55;

export function isLowConfidence(value: number | null | undefined) {
  return value == null || value < LOW;
}

function geminiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function openaiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

export function resolveProvider(): "google" | "openai" | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "google" && geminiKey()) return "google";
  if (forced === "openai" && openaiKey()) return "openai";
  if (geminiKey()) return "google";
  if (openaiKey()) return "openai";
  return null;
}

function usdPerCall(provider: "google" | "openai") {
  const override = Number(process.env.AI_USD_PER_CALL ?? "");
  if (Number.isFinite(override) && override > 0) return override;
  return provider === "google" ? 0.002 : 0.008;
}

function budgetUsd() {
  const raw = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export async function getAiRuntime(): Promise<AiRuntime> {
  const month = monthKeyFromDate();
  const provider = resolveProvider();
  const stored = await prisma.appSetting.findUnique({ where: { key: "aiUsage" } });
  let calls = 0;
  let estimatedUsd = 0;
  if (stored?.value) {
    try {
      const parsed = JSON.parse(stored.value) as { month?: string; calls?: number; usd?: number };
      if (parsed.month === month) {
        calls = parsed.calls ?? 0;
        estimatedUsd = parsed.usd ?? 0;
      }
    } catch {
      /* ignore */
    }
  }
  const budget = budgetUsd();
  if (!provider) {
    return { available: false, provider: null, reason: "no_key", calls, estimatedUsd, budgetUsd: budget, month };
  }
  const nextCost = usdPerCall(provider);
  if (budget != null && estimatedUsd + nextCost > budget) {
    return { available: false, provider, reason: "budget", calls, estimatedUsd, budgetUsd: budget, month };
  }
  return { available: true, provider, reason: "ok", calls, estimatedUsd, budgetUsd: budget, month };
}

async function recordAiCall(provider: "google" | "openai") {
  const month = monthKeyFromDate();
  const current = await getAiRuntime();
  const payload = {
    month,
    calls: (current.month === month ? current.calls : 0) + 1,
    usd: (current.month === month ? current.estimatedUsd : 0) + usdPerCall(provider),
  };
  await prisma.appSetting.upsert({
    where: { key: "aiUsage" },
    update: { value: JSON.stringify(payload) },
    create: { key: "aiUsage", value: JSON.stringify(payload) },
  });
}

function chartPrompt() {
  return CHART_OF_ACCOUNTS.map((parent) => {
    const kids = parent.children.map((child) => `    - ${child.id} | ${child.name}`).join("\n");
    return `${parent.kind === "EXPENSE" ? "הוצאה" : "הכנסה"} / ${parent.name} (${parent.id}):\n${kids}`;
  }).join("\n");
}

function buildPrompt() {
  return `אתה מנתח חשבוניות למסעדת Vivac'e / ויואצ'ה (עוסק מורשה 204754121) בישראל.
חלץ מהמסמך: שם ספק, תאריך חשבונית, סכום כולל בשקלים אם נראה.
הצע את כרטיס הנה״ח הבן (LEAF) המתאים ביותר. אסור לבחור קטגוריית אב.
החזר JSON בלבד במבנה:
{"supplierName":"","invoiceDate":"YYYY-MM-DD או ריק","totalIls":0,"accountId":"acc_...","confidence":0.0,"reason":"משפט קצר בעברית"}
confidence בין 0 ל-1. אם לא בטוח — confidence נמוך מ-0.55.

כרטיסים מותרים (רק מזהי הבנים):
${chartPrompt()}`;
}

function parseSuggestion(raw: string): AiSuggestion | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const accountId = typeof parsed.accountId === "string" && isChartLeafId(parsed.accountId) ? parsed.accountId : null;
    const total = typeof parsed.totalIls === "number" ? parsed.totalIls : Number(parsed.totalIls);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : Number(parsed.confidence);
    return {
      supplierName: typeof parsed.supplierName === "string" ? parsed.supplierName || null : null,
      invoiceDate: typeof parsed.invoiceDate === "string" ? parsed.invoiceDate || null : null,
      totalIls: Number.isFinite(total) ? total : null,
      accountId,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return null;
  }
}

export async function analyzeInvoiceDocument(input: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<AiSuggestion | null> {
  return runVisionJson(buildPrompt(), input, parseSuggestion);
}

export type ReceiptExtractLine = {
  name: string | null;
  sku: string | null;
  qty: number | null;
  unitPrice: number | null;
};

function buildReceiptPrompt(catalog: { name: string; sku: string | null }[]) {
  const list = catalog
    .map((item) => `- ${item.name}${item.sku ? ` | מק״ט ${item.sku}` : ""}`)
    .join("\n");
  return `אתה קורא תעודת משלוח / חשבונית מס למסעדת Vivac'e.
חלץ שורות פריטים: שם, מק״ט אם יש, כמות שהתקבלה, מחיר יחידה בשקלים.
החזר JSON בלבד:
{"lines":[{"name":"","sku":"","qty":0,"unitPrice":0}]}
qty מספר שלם. אם לא בטוח בכמות — השאר את הכמות מההזמנה אל תמציא.
פריטי ההזמנה האפשריים:
${list}`;
}

function parseReceiptLines(raw: string): ReceiptExtractLine[] | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { lines?: unknown };
    if (!Array.isArray(parsed.lines)) return null;
    return parsed.lines.map((item) => {
      const row = item as Record<string, unknown>;
      const qty = Number(row.qty);
      const unitPrice = Number(row.unitPrice);
      return {
        name: typeof row.name === "string" ? row.name : null,
        sku: typeof row.sku === "string" ? row.sku : null,
        qty: Number.isFinite(qty) ? Math.round(qty) : null,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : null,
      };
    });
  } catch {
    return null;
  }
}

async function runVisionJson<T>(
  prompt: string,
  input: { buffer: Buffer; mimeType: string; fileName: string },
  parse: (raw: string) => T | null,
): Promise<T | null> {
  const runtime = await getAiRuntime();
  if (!runtime.available || !runtime.provider) return null;
  const b64 = input.buffer.toString("base64");
  const mime = input.mimeType || "image/jpeg";
  try {
    const raw =
      runtime.provider === "google"
        ? await callGemini(prompt, b64, mime)
        : await callOpenAi(prompt, b64, mime, input.fileName);
    await recordAiCall(runtime.provider);
    return parse(raw);
  } catch (error) {
    console.error("AI vision failed", error);
    return null;
  }
}

export async function analyzeReceiptLines(input: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  catalog: { name: string; sku: string | null }[];
}): Promise<ReceiptExtractLine[] | null> {
  return runVisionJson(buildReceiptPrompt(input.catalog), input, parseReceiptLines);
}

async function callGemini(prompt: string, b64: string, mime: string) {
  const key = geminiKey();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }],
          },
        ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function callOpenAi(prompt: string, b64: string, mime: string, fileName: string) {
  const key = openaiKey();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
  const imageContent =
    mime === "application/pdf"
      ? [{ type: "text", text: `הקובץ PDF בשם ${fileName}. אין תמונה — הערך לפי השם בלבד והחזר confidence נמוך.` }]
      : [
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${b64}` },
          },
        ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageContent],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}
