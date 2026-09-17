"use server";

import { completeChatText, getAiRuntime } from "@/lib/ai";
import { buildChatContext } from "@/lib/chat-context";
import {
  clearCurrentChat as clearCurrentChatInDb,
  createChatThread as createChatThreadInDb,
  ensureChatWorkspace,
  loadChatPanel,
  rememberThreadActivity,
  selectChatThread as selectChatThreadInDb,
  setCurrentThreadId,
} from "@/lib/chat-threads";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";

export async function getChatPanel() {
  return ensureChatWorkspace(prisma);
}

export async function createChatThread() {
  return createChatThreadInDb(prisma);
}

export async function selectChatThread(threadId: string) {
  return selectChatThreadInDb(prisma, threadId);
}

export async function clearCurrentChat() {
  return clearCurrentChatInDb(prisma);
}

export async function sendChatMessage(formData: FormData) {
  await requirePermission("nav.chat");
  const question = String(formData.get("message") ?? "").trim();
  const path = String(formData.get("path") ?? "/").trim() || "/";
  const requestedThreadId = String(formData.get("threadId") ?? "").trim();
  if (!question) throw new Error("יש לכתוב שאלה");

  const panel = await ensureChatWorkspace(prisma);
  let threadId = requestedThreadId || panel.currentThreadId;
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) threadId = panel.currentThreadId;
  await setCurrentThreadId(prisma, threadId);

  await prisma.chatMessage.create({ data: { role: "user", content: question, path, threadId } });

  const runtime = await getAiRuntime();
  if (!runtime.available) {
    const content =
      runtime.reason === "budget"
        ? "חריגה מתקציב AI החודש. אפשר להמשיך ידנית במסכים, או להעלות AI_MONTHLY_BUDGET_USD."
        : "חסר מפתח AI. הגדירו GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY או OPENAI_API_KEY ב-Railway. בלי מפתח הצ'אט לא עונה מנתונים חיים.";
    await prisma.chatMessage.create({ data: { role: "assistant", content, path, threadId } });
    await rememberThreadActivity(prisma, threadId, question);
    return loadChatPanel(prisma, threadId);
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
  await prisma.chatMessage.create({ data: { role: "assistant", content: answer, path, threadId } });
  await rememberThreadActivity(prisma, threadId, question);
  return loadChatPanel(prisma, threadId);
}

