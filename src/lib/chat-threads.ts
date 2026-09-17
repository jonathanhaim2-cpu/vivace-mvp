import type { PrismaClient } from "@prisma/client";
import type { ChatPanelState, ChatThreadSummary } from "./chat-types";

export const ARCHIVE_THREAD_TITLE = "קודם";
export const NEW_THREAD_TITLE = "שיחה חדשה";
export const CURRENT_THREAD_SETTING_KEY = "chatCurrentThreadId";
const MESSAGE_LIMIT = 40;

function serializeThread(thread: {
  id: string;
  title: string;
  createdAt: Date;
  archived: boolean;
}): ChatThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt.toISOString(),
    archived: thread.archived,
  };
}

export function titleFromFirstMessage(question: string) {
  const text = question.replace(/\s+/g, " ").trim();
  if (!text) return NEW_THREAD_TITLE;
  return text.length <= 36 ? text : `${text.slice(0, 36)}…`;
}

export async function setCurrentThreadId(db: PrismaClient, threadId: string) {
  await db.appSetting.upsert({
    where: { key: CURRENT_THREAD_SETTING_KEY },
    update: { value: threadId },
    create: { key: CURRENT_THREAD_SETTING_KEY, value: threadId },
  });
}

/** Move pre-thread rows into one archived conversation named «קודם». Idempotent. */
export async function migrateOrphanChatMessages(db: PrismaClient) {
  const orphans = await db.chatMessage.findMany({
    where: { threadId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (orphans.length === 0) return null;

  const existingArchive = await db.chatThread.findFirst({
    where: { archived: true, title: ARCHIVE_THREAD_TITLE },
    orderBy: { createdAt: "asc" },
  });
  const archive =
    existingArchive ??
    (await db.chatThread.create({
      data: { title: ARCHIVE_THREAD_TITLE, archived: true },
    }));

  await db.chatMessage.updateMany({
    where: { id: { in: orphans.map((row) => row.id) } },
    data: { threadId: archive.id },
  });
  return archive;
}

export async function loadChatPanel(db: PrismaClient, threadId: string): Promise<ChatPanelState> {
  const [threads, messages] = await Promise.all([
    db.chatThread.findMany({
      orderBy: [{ archived: "asc" }, { updatedAt: "desc" }],
    }),
    db.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: MESSAGE_LIMIT,
    }),
  ]);
  const chronological = [...messages].reverse();
  return {
    currentThreadId: threadId,
    threads: threads.map(serializeThread),
    messages: chronological.map((row) => ({ id: row.id, role: row.role, content: row.content })),
  };
}

/**
 * Ensures threads exist, archives orphaned history once, and opens a live thread.
 * After deploy: old messages land in «קודם», current panel is a fresh empty thread.
 */
export async function ensureChatWorkspace(db: PrismaClient): Promise<ChatPanelState> {
  const migrated = await migrateOrphanChatMessages(db);

  let currentId =
    (await db.appSetting.findUnique({ where: { key: CURRENT_THREAD_SETTING_KEY } }))?.value ?? null;
  if (currentId) {
    const exists = await db.chatThread.findUnique({
      where: { id: currentId },
      select: { id: true },
    });
    if (!exists) currentId = null;
  }

  if (!currentId) {
    const latestLive = await db.chatThread.findFirst({
      where: { archived: false },
      orderBy: { updatedAt: "desc" },
    });
    if (latestLive) {
      currentId = latestLive.id;
    } else {
      const created = await db.chatThread.create({
        data: { title: NEW_THREAD_TITLE, archived: false },
      });
      currentId = created.id;
    }
    await setCurrentThreadId(db, currentId);
  } else if (migrated) {
    const current = await db.chatThread.findUnique({ where: { id: currentId } });
    if (!current || current.archived) {
      const created = await db.chatThread.create({
        data: { title: NEW_THREAD_TITLE, archived: false },
      });
      currentId = created.id;
      await setCurrentThreadId(db, currentId);
    }
  }

  return loadChatPanel(db, currentId);
}

export async function createChatThread(db: PrismaClient) {
  await ensureChatWorkspace(db);
  const empty = await db.chatThread.findFirst({
    where: { archived: false, messages: { none: {} } },
    orderBy: { updatedAt: "desc" },
  });
  const thread =
    empty ??
    (await db.chatThread.create({
      data: { title: NEW_THREAD_TITLE, archived: false },
    }));
  await setCurrentThreadId(db, thread.id);
  return loadChatPanel(db, thread.id);
}

export async function selectChatThread(db: PrismaClient, threadId: string) {
  await ensureChatWorkspace(db);
  const thread = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("השיחה לא נמצאה");
  await setCurrentThreadId(db, threadId);
  return loadChatPanel(db, threadId);
}

/** Deletes messages in the active thread so the panel is empty (thread stays). */
export async function clearCurrentChat(db: PrismaClient) {
  const state = await ensureChatWorkspace(db);
  const thread = await db.chatThread.findUnique({ where: { id: state.currentThreadId } });
  if (thread?.archived) {
    return createChatThread(db);
  }
  await db.chatMessage.deleteMany({ where: { threadId: state.currentThreadId } });
  await db.chatThread.update({
    where: { id: state.currentThreadId },
    data: { title: NEW_THREAD_TITLE },
  });
  return loadChatPanel(db, state.currentThreadId);
}

export async function rememberThreadActivity(db: PrismaClient, threadId: string, question: string) {
  const live = await db.chatThread.findUnique({ where: { id: threadId } });
  if (!live) return;
  await db.chatThread.update({
    where: { id: threadId },
    data: {
      updatedAt: new Date(),
      ...(!live.archived && live.title === NEW_THREAD_TITLE
        ? { title: titleFromFirstMessage(question) }
        : {}),
    },
  });
}
