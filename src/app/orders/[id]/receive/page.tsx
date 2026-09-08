import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ReceiveForm } from "@/components/receipts/receive-form";
import { getAiRuntime } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export default async function ReceiveOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { include: { product: true } },
      receipt: true,
    },
  });
  if (!order) notFound();
  if (order.receipt) redirect(`/receipts/${order.receipt.id}`);
  const runtime = await getAiRuntime();

  return (
    <div>
      <PageHeader
        title={`קליטה · ${order.supplier.name}`}
        description="העלו תעודת משלוח — ה-AI ממלא כמויות ומחירים. העובד מאשר בעיקר כמויות שלמות."
      />
      <ReceiveForm orderId={order.id} lines={order.lines} aiAvailable={runtime.available} />
    </div>
  );
}
