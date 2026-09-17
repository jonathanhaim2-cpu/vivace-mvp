"use client";

import { cancelGoodsReceipt } from "@/actions/receipts";
import { Button } from "@/components/ui/button";

export function CancelReceiptButton({ receiptId }: { receiptId: string }) {
  return (
    <form
      action={cancelGoodsReceipt.bind(null, receiptId)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "לבטל את הקליטה? ההזמנה תחזור למצב «נשלחה לספק», המסמכים החריגים של הקליטה יימחקו, וצילומי החשבונית יישארו בתור החשבוניות. אפשר לקלוט מחדש.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" size="sm" variant="destructive">
        בטל קליטה
      </Button>
    </form>
  );
}
