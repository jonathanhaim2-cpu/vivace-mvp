"use client";

import { markOrderSent } from "@/actions/orders";
import { Button } from "@/components/ui/button";

export function WhatsAppButton({
  orderId,
  href,
}: {
  orderId: string;
  href: string;
}) {
  return (
    <Button
      type="button"
      onClick={async () => {
        await markOrderSent(orderId);
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      שליחה בוואטסאפ
    </Button>
  );
}
