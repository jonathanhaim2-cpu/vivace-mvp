import { analyzeInvoicePhoto } from "@/actions/invoices";
import { Button } from "@/components/ui/button";

export function AnalyzeInvoiceButton({ photoId }: { photoId: string }) {
  return (
    <form action={analyzeInvoicePhoto.bind(null, photoId)}>
      <Button type="submit" size="sm" variant="outline">
        נתח עם AI
      </Button>
    </form>
  );
}
