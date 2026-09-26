import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestPreviewActions } from "@/components/credits/request-preview-actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requestKindLabel } from "@/lib/supplier-requests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreditPreviewPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params;
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId },
    include: {
      order: { include: { supplier: true, branch: true } },
      supplierRequests: { include: { lines: true } },
    },
  });
  if (!receipt) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title="אישור לפני שליחה"
        description={`${receipt.order.supplier.name} · ${receipt.order.branch.name}. שום דבר לא נשלח עד שלוחצים על אישור.`}
      />
      <p className="text-sm text-muted-foreground">
        אין שרת דואר יוצא מוגדר. האישור פותח טיוטת מייל אצלכם ומסמן את הבקשה כנשלחה. ראו TODO ב־DEPLOY.md
        (RESEND_API_KEY או SMTP_*).
      </p>
      {receipt.supplierRequests.length === 0 ? (
        <p className="text-sm">לא נוצרו בקשות לפערים בקליטה הזו.</p>
      ) : (
        receipt.supplierRequests.map((request) => {
          const email = receipt.order.supplier.accountingEmail ?? "";
          const mailto = `mailto:${email}?subject=${encodeURIComponent(requestKindLabel(request.kind))}&body=${encodeURIComponent(request.previewBody)}`;
          return (
            <article key={request.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <h2 className="font-medium">{requestKindLabel(request.kind)}</h2>
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm">{request.previewBody}</pre>
              <RequestPreviewActions
                requestId={request.id}
                body={request.previewBody}
                mailto={mailto}
                sent={Boolean(request.sentAt)}
              />
            </article>
          );
        })
      )}
      <Link href={`/receipts/${receipt.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
        המשך למסמך הקליטה
      </Link>
    </div>
  );
}
