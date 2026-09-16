"use client";

import { markOrderSent } from "@/actions/orders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WhatsAppButton({
  orderId,
  href,
  label = "שליחה בוואטסאפ",
}: {
  orderId: string;
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants())}
      onClick={() => {
        void markOrderSent(orderId);
      }}
    >
      {label}
    </a>
  );
}
