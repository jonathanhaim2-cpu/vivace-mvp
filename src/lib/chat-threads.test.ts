import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  ARCHIVE_THREAD_TITLE,
  CURRENT_THREAD_SETTING_KEY,
  clearCurrentChat,
  createChatThread,
  ensureChatWorkspace,
  NEW_THREAD_TITLE,
  selectChatThread,
  titleFromFirstMessage,
} from "./chat-threads";

function openTempDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "chat-threads-"));
  const dbPath = path.join(dir, "test.db");
  const url = `file:${dbPath}`;
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  return { dir, client: new PrismaClient({ datasourceUrl: url }) };
}

test("titleFromFirstMessage trims and truncates", () => {
  assert.equal(titleFromFirstMessage("  כמה לתשלום  "), "כמה לתשלום");
  assert.equal(titleFromFirstMessage(""), NEW_THREAD_TITLE);
  const long = "א".repeat(40);
  assert.equal(titleFromFirstMessage(long), `${"א".repeat(36)}…`);
});

test("orphaned messages migrate into קודם and a fresh thread is current", async () => {
  const { dir, client } = openTempDb();
  try {
    await client.chatMessage.create({
      data: { role: "user", content: "שלום", path: "/" },
    });
    await client.chatMessage.create({
      data: {
        role: "assistant",
        content:
          "חסר מפתח AI. הגדירו GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY או OPENAI_API_KEY ב-Railway. בלי מפתח הצ'אט לא עונה מנתונים חיים.",
        path: "/",
      },
    });

    const first = await ensureChatWorkspace(client);
    assert.equal(first.messages.length, 0);
    const archive = first.threads.find((thread) => thread.archived && thread.title === ARCHIVE_THREAD_TITLE);
    assert.ok(archive);
    assert.notEqual(first.currentThreadId, archive.id);
    const current = first.threads.find((thread) => thread.id === first.currentThreadId);
    assert.equal(current?.archived, false);
    assert.equal(current?.title, NEW_THREAD_TITLE);

    const archivedMessages = await client.chatMessage.findMany({
      where: { threadId: archive.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(archivedMessages.length, 2);
    assert.ok(archivedMessages.some((row) => row.content.includes("חסר מפתח AI")));

    const second = await ensureChatWorkspace(client);
    assert.equal(second.currentThreadId, first.currentThreadId);
    assert.equal(second.messages.length, 0);
    assert.equal(second.threads.filter((thread) => thread.archived).length, 1);
  } finally {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("new thread is empty and previous thread stays selectable", async () => {
  const { dir, client } = openTempDb();
  try {
    const panel = await ensureChatWorkspace(client);
    await client.chatMessage.create({
      data: {
        role: "user",
        content: "כמה לתשלום לספקים",
        path: "/",
        threadId: panel.currentThreadId,
      },
    });
    await client.chatThread.update({
      where: { id: panel.currentThreadId },
      data: { title: "כמה לתשלום לספקים" },
    });

    const created = await createChatThread(client);
    assert.equal(created.messages.length, 0);
    assert.notEqual(created.currentThreadId, panel.currentThreadId);
    assert.ok(created.threads.some((thread) => thread.id === panel.currentThreadId));

    const switched = await selectChatThread(client, panel.currentThreadId);
    assert.equal(switched.currentThreadId, panel.currentThreadId);
    assert.equal(switched.messages.length, 1);
    assert.equal(switched.messages[0]?.content, "כמה לתשלום לספקים");
  } finally {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clear current chat deletes messages but keeps the thread", async () => {
  const { dir, client } = openTempDb();
  try {
    const panel = await ensureChatWorkspace(client);
    await client.chatMessage.create({
      data: { role: "user", content: "סכם חריגות", path: "/", threadId: panel.currentThreadId },
    });
    await client.chatThread.update({
      where: { id: panel.currentThreadId },
      data: { title: "סכם חריגות" },
    });

    const cleared = await clearCurrentChat(client);
    assert.equal(cleared.currentThreadId, panel.currentThreadId);
    assert.equal(cleared.messages.length, 0);
    assert.equal(
      cleared.threads.find((thread) => thread.id === panel.currentThreadId)?.title,
      NEW_THREAD_TITLE,
    );
    const leftover = await client.chatMessage.count({ where: { threadId: panel.currentThreadId } });
    assert.equal(leftover, 0);

    const setting = await client.appSetting.findUnique({ where: { key: CURRENT_THREAD_SETTING_KEY } });
    assert.equal(setting?.value, panel.currentThreadId);
  } finally {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clear on archived קודם starts a live thread and keeps archive messages", async () => {
  const { dir, client } = openTempDb();
  try {
    await client.chatMessage.create({
      data: { role: "assistant", content: "חסר מפתח AI", path: "/" },
    });
    const first = await ensureChatWorkspace(client);
    const archive = first.threads.find((thread) => thread.archived);
    assert.ok(archive);
    await selectChatThread(client, archive.id);
    const cleared = await clearCurrentChat(client);
    assert.equal(cleared.messages.length, 0);
    assert.notEqual(cleared.currentThreadId, archive.id);
    const archivedCount = await client.chatMessage.count({ where: { threadId: archive.id } });
    assert.equal(archivedCount, 1);
  } finally {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createChatThread reuses an existing empty live thread", async () => {
  const { dir, client } = openTempDb();
  try {
    const panel = await ensureChatWorkspace(client);
    const again = await createChatThread(client);
    assert.equal(again.currentThreadId, panel.currentThreadId);
    assert.equal(again.threads.filter((thread) => !thread.archived).length, 1);
  } finally {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Railway db push from legacy ChatMessage keeps rows then archives them", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "chat-threads-push-"));
  const dbPath = path.join(dir, "test.db");
  const url = `file:${dbPath}`;
  const oldSchemaPath = path.join(dir, "old.prisma");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    oldSchemaPath,
    `generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
model ChatMessage {
  id        String   @id @default(cuid())
  role      String
  content   String
  path      String?
  createdAt DateTime @default(now())
}
model AppSetting {
  key   String @id
  value String
}
`,
  );
  const push = (schema: string) =>
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema", schema], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
  try {
    push(oldSchemaPath);
    const bootstrap = new PrismaClient({ datasourceUrl: url });
    try {
      await bootstrap.$executeRawUnsafe(
        `INSERT INTO "ChatMessage" ("id", "role", "content", "path", "createdAt") VALUES ('legacy_msg', 'assistant', 'חסר מפתח AI — שיוך ידני', '/', CURRENT_TIMESTAMP)`,
      );
    } finally {
      await bootstrap.$disconnect();
    }

    push(path.join(process.cwd(), "prisma", "schema.prisma"));
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      const orphans = await client.chatMessage.count({ where: { threadId: null } });
      assert.equal(orphans, 1);
      const panel = await ensureChatWorkspace(client);
      assert.equal(panel.messages.length, 0);
      const archive = panel.threads.find((thread) => thread.title === ARCHIVE_THREAD_TITLE);
      assert.ok(archive);
      const kept = await client.chatMessage.findMany({ where: { threadId: archive.id } });
      assert.equal(kept.length, 1);
      assert.equal(kept[0]?.content, "חסר מפתח AI — שיוך ידני");
    } finally {
      await client.$disconnect();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
