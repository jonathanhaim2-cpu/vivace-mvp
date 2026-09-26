"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

const ITEMS = [
  { href: "/invoices/import", label: "ייבוא מתיקייה" },
  { href: "/invoices/mail", label: "חיבור מייל" },
  { href: "/invoices/package", label: "חבילה להנה״ח" },
];

export function InvoiceOverflowMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="פעולות נוספות"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open ? (
        <div className="absolute end-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border bg-popover p-1 shadow-lg">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
