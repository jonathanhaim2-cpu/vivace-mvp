import { COMPANY } from "@/lib/constants";
import { describePackaging, formatDate, formatIls, lineTotal } from "@/lib/format";
import { resolveBranchContact, type OrderHeaderBranch } from "@/lib/order-header";

type Line = {
  qty: number;
  unitPrice: number;
  discountPercent: number;
  product: {
    name: string;
    sku: string | null;
    cartonToBags: number | null;
    bagsToUnits: number | null;
  };
};

export function OrderDocument({
  branch,
  supplierName,
  deliveryPointNumber,
  createdAt,
  notesForDriver,
  lines,
}: {
  branch: OrderHeaderBranch;
  supplierName: string;
  deliveryPointNumber?: string | null;
  createdAt: Date;
  notesForDriver?: string | null;
  lines: Line[];
}) {
  const contact = resolveBranchContact(branch);
  const total = lines.reduce((sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent), 0);
  return (
    <div className="rounded-xl border bg-white p-4 text-sm text-zinc-950 print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="font-heading text-lg font-semibold">
            {COMPANY.nameHe} / {COMPANY.name}
          </p>
          <p className="text-xs text-zinc-600">{COMPANY.tagline} · ח.פ. {COMPANY.taxId}</p>
        </div>
        <div className="text-end">
          <p className="font-medium">הזמנת רכש</p>
          <p className="text-xs text-zinc-600">{formatDate(createdAt)}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        <p>
          <span className="text-zinc-500">סניף: </span>
          {contact.name}
        </p>
        <p>
          <span className="text-zinc-500">כתובת: </span>
          {contact.address}
        </p>
        <p>
          <span className="text-zinc-500">טלפון: </span>
          {contact.phone}
        </p>
        <p>
          <span className="text-zinc-500">איש קשר: </span>
          {contact.contactName}
        </p>
        <p>
          <span className="text-zinc-500">ספק: </span>
          {supplierName}
        </p>
        {deliveryPointNumber ? (
          <p>
            <span className="text-zinc-500">נקודת חלוקה: </span>
            {deliveryPointNumber}
          </p>
        ) : null}
      </div>
      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="border-b text-zinc-500">
            <th className="py-1.5 text-start font-medium">פריט</th>
            <th className="py-1.5 text-start font-medium">מק״ט</th>
            <th className="py-1.5 text-start font-medium">כמות</th>
            <th className="py-1.5 text-start font-medium">מחיר</th>
            <th className="py-1.5 text-end font-medium">סה״כ</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const pack = describePackaging(line.qty, line.product.cartonToBags, line.product.bagsToUnits);
            return (
              <tr key={`${line.product.sku ?? line.product.name}-${index}`} className="border-b border-zinc-100">
                <td className="py-1.5">
                  {line.product.name}
                  {pack ? <span className="block text-[10px] text-zinc-500">{pack}</span> : null}
                </td>
                <td className="py-1.5 font-mono" dir="ltr">
                  {line.product.sku || "—"}
                </td>
                <td className="py-1.5 tabular-nums">{line.qty}</td>
                <td className="py-1.5 tabular-nums">{formatIls(line.unitPrice)}</td>
                <td className="py-1.5 text-end tabular-nums">
                  {formatIls(lineTotal(line.qty, line.unitPrice, line.discountPercent))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between text-sm font-medium">
        <span>הערות למפיץ: {notesForDriver || "אין"}</span>
        <span>סה״כ {formatIls(total)}</span>
      </div>
    </div>
  );
}
