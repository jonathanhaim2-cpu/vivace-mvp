"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { sendChatMessage } from "@/actions/chat";
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

type ChatRow = { id: string; role: string; content: string };

export function AppChat({
  messages,
  aiAvailable,
}: {
  messages: ChatRow[];
  aiAvailable: boolean;
}) {
  const pathname = usePathname();
  const [rows, setRows] = useState(messages);
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
    start(async () => {
      const next = await sendChatMessage(fd);
      setRows(next);
    });
  }

  return (
    <Sheet>
      <SheetTrigger
        className="fixed bottom-20 end-4 z-40 flex max-w-[calc(100vw-2rem)] cursor-pointer items-end gap-2 border-0 bg-transparent p-0 text-start text-foreground shadow-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:bottom-6"
        title="עוזר Vivac'e"
      >
        <span className="max-w-[11.5rem] rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 text-[11px] leading-snug shadow-sm sm:max-w-[14rem] sm:text-xs">
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
        {!aiAvailable ? (
          <p className="px-4 text-sm text-muted-foreground">
            חסר מפתח AI. הגדירו GOOGLE_GENERATIVE_AI_API_KEY או OPENAI_API_KEY. בלי מפתח תוצג הודעת התקנה אחרי השאלה.
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">למשל: כמה לתשלום לספקים החודש? או סכם חריגות רכש.</p>
          ) : (
            rows.map((row) => (
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
