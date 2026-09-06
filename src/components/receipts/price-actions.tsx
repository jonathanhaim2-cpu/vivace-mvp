import { approvePriceChange, rejectPriceChange } from "@/actions/receipts";
import { Button } from "@/components/ui/button";

export function PriceActions({ lineId }: { lineId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={approvePriceChange.bind(null, lineId)}>
        <Button type="submit" size="sm">
          אישור מחיר חדש
        </Button>
      </form>
      <form action={rejectPriceChange.bind(null, lineId)}>
        <Button type="submit" size="sm" variant="destructive">
          דחייה · בקשת זיכוי
        </Button>
      </form>
    </div>
  );
}
