"use client";

import { discardInvoicePhoto } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { invoiceDiscardConfirmMessage } from "@/lib/invoice-discard";
import { cn } from "@/lib/utils";

type Props = {
  photoId: string;
  label?: string;
  isDuplicate?: boolean;
  accountId?: string | null;
  notInvoice?: boolean;
  className?: string;
};

export function DiscardInvoiceButton({
  photoId,
  label,
  isDuplicate = false,
  accountId = null,
  notInvoice = false,
  className,
}: Props) {
  const text = label ?? (notInvoice ? "לא רלוונטי" : "מחק");
  const confirmMessage = invoiceDiscardConfirmMessage({ isDuplicate, accountId, notInvoice });

  return (
    <form
      action={discardInvoicePhoto.bind(null, photoId)}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <Button
        type="submit"
        size="sm"
        variant={notInvoice || isDuplicate ? "destructive" : "outline"}
        className={cn(notInvoice ? "min-w-[7.5rem]" : undefined, className)}
      >
        {text}
      </Button>
    </form>
  );
}
