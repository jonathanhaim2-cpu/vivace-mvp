import { analyzeInvoicePhoto } from "@/actions/invoices";
import { Button } from "@/components/ui/button";

export function AnalyzeInvoiceButton({ photoId, returnTo }: { photoId: string; returnTo?: string }) {
  return (
    <form action={analyzeInvoicePhoto.bind(null, photoId)}>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Button type="submit" size="sm" variant="outline">
        נתח עם AI
      </Button>
    </form>
  );
}
