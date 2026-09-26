"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Eraser, MessageCircle, Plus } from "lucide-react";
import {
  clearCurrentChat,
  createChatThread,
  selectChatThread,
  sendChatMessage,
} from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ChatPanelState } from "@/lib/chat-types";

function threadLabel(thread: ChatPanelState["threads"][number]) {
  return thread.archived ? `ארכיון · ${thread.title}` : thread.title;
}

export function AppChat({
  panel,
  aiAvailable,
  open,
  onOpenChange,
}: {
  panel: ChatPanelState;
  aiAvailable: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [state, setState] = useState(panel);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    setText("");
    const fd = new FormData();
    fd.set("message", question);
    fd.set("path", pathname);
    fd.set("threadId", state.currentThreadId);
    start(async () => {
      const next = await sendChatMessage(fd);
      setState(next);
    });
  }

  function onNewChat() {
    start(async () => {
      const next = await createChatThread();
      setState(next);
    });
  }

  function onClear() {
    start(async () => {
      const next = await clearCurrentChat();
      setState(next);
    });
  }

  function onSelectThread(threadId: string) {
    if (threadId === state.currentThreadId) return;
    start(async () => {
      const next = await selectChatThread(threadId);
      setState(next);
    });
  }

  const currentThread = state.threads.find((thread) => thread.id === state.currentThreadId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        className="fixed bottom-20 end-4 z-40 hidden max-w-[calc(100vw-2rem)] cursor-pointer items-end gap-2 border-0 bg-transparent p-0 text-start text-foreground shadow-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:invisible data-popup-open:pointer-events-none lg:bottom-6 lg:flex"
        title="עוזר Vivac'e"
      >
        <span className="hidden max-w-[11.5rem] rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 text-[11px] leading-snug shadow-sm sm:inline-block sm:max-w-[14rem] sm:text-xs">
          שאלו על רכש, Food Cost או AP לפי הנתונים החיים
        </span>
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <MessageCircle className="size-5" />
        </span>
        <span className="sr-only">עוזר Vivac&apos;e</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>עוזר Vivac&apos;e</SheetTitle>
          <SheetDescription>
            שאלו על רכש, Food Cost או AP לפי הנתונים החיים במערכת.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            <span>שיחה</span>
            <select
              className="h-8 w-full min-w-0 rounded-full border border-border bg-card px-2 text-xs text-foreground"
              value={state.currentThreadId}
              disabled={pending || state.threads.length === 0}
              onChange={(event) => onSelectThread(event.target.value)}
            >
              {state.threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {threadLabel(thread)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onNewChat}>
              <Plus data-icon="inline-start" />
              שיחה חדשה
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending || state.messages.length === 0 || currentThread?.archived}
              onClick={onClear}
            >
              <Eraser data-icon="inline-start" />
              נקה שיחה
            </Button>
          </div>
        </div>
        {!aiAvailable ? (
          <p className="px-4 text-sm text-muted-foreground">
            חסר מפתח AI. הגדירו GOOGLE_GENERATIVE_AI_API_KEY או OPENAI_API_KEY. בלי מפתח תוצג הודעת התקנה אחרי השאלה.
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
          {state.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">למשל: כמה לתשלום לספקים החודש? או סכם חריגות רכש.</p>
          ) : (
            state.messages.map((row) => (
              <div
                key={row.id}
                className={
                  row.role === "user"
                    ? "ms-8 rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "me-4 rounded-2xl bg-muted px-3 py-2 text-sm"
                }
              >
                {row.content}
              </div>
            ))
          )}
        </div>
        <form onSubmit={onSubmit} className="space-y-2 p-4">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder="שאלה על הרכש, AP או Food Cost"
          />
          <Button type="submit" disabled={pending || !text.trim()}>
            {pending ? "חושב..." : "שליחה"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
