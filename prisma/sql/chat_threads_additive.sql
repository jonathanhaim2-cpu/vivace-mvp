-- Additive SQLite change for chat sessions.
-- Railway `start:prod` applies this via `prisma db push` (nullable threadId keeps existing rows).
-- Safe to run once by hand on the volume if you need SQL instead of db push.

CREATE TABLE IF NOT EXISTS "ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false
);

-- SQLite ignores ADD COLUMN if you re-run after Prisma already rebuilt the table.
-- Prisma runtime backfill attaches orphan ChatMessage rows to an archived thread titled קודם.

ALTER TABLE "ChatMessage" ADD COLUMN "threadId" TEXT;

CREATE INDEX IF NOT EXISTS "ChatMessage_threadId_createdAt_idx"
  ON "ChatMessage"("threadId", "createdAt");
