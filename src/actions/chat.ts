"use server";

import { completeChatText, getAiRuntime } from "@/lib/ai";
import { buildChatContext } from "@/lib/chat-context";
import { prisma } from "@/lib/prisma";

export async function listChatMessages() {
  return prisma.chatMessage.findMany({ orderBy: { createdAt: "asc" }, take: 40 });
}

export async function sendChatMessage(formData: FormData) {
  const question = String(formData.get("message") ?? "").trim();
  const path = String(formData.get("path") ?? "/").trim() || "/";
  if (!question) throw new Error("יש לכתוב שאלה");

  await prisma.chatMessage.create({ data: { role: "user", content: question, path } });

  const runtime = await getAiRuntime();
  if (!runtime.available) {
    const content =
      runtime.reason === "budget"
        ? "חריגה מתקציב AI החודש. אפשר להמשיך ידנית במסכים, או להעלות AI_MONTHLY_BUDGET_USD."
        : "חסר מפתח AI. הגדירו GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY או OPENAI_API_KEY ב-Railway. בלי מפתח הצ'אט לא עונה מנתונים חיים.";
    await prisma.chatMessage.create({ data: { role: "assistant", content, path } });
    return listChatMessages();
  }

  const context = await buildChatContext(path);
  const prompt = `אתה עוזר רכש ל-Vivac'e / ויואצ'ה. ענה בעברית קצר ולעניין לפי הנתונים בלבד. אם חסר — אמור מה לבדוק במסך.
אפשר להציע סיכום דוח קצר.

נתונים:
${context}

שאלה:
${question}`;

  const answer =
    (await completeChatText(prompt)) ?? "המודל לא החזיר תשובה. נסו שוב או בדקו את המפתח.";
  await prisma.chatMessage.create({ data: { role: "assistant", content: answer, path } });
  return listChatMessages();
}
