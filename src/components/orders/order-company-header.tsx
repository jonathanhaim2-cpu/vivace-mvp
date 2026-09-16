import { COMPANY } from "@/lib/constants";
import { resolveBranchContact, type OrderHeaderBranch } from "@/lib/order-header";

export function OrderCompanyHeader({
  branch,
  className,
}: {
  branch: OrderHeaderBranch;
  className?: string;
}) {
  const contact = resolveBranchContact(branch);
  return (
    <div className={className}>
      <p className="font-heading text-base font-semibold">
        הזמנה מטעם {COMPANY.nameHe} / {COMPANY.name}
      </p>
      <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
        <li>סניף: {contact.name}</li>
        <li>כתובת: {contact.address}</li>
        <li>טלפון: {contact.phone}</li>
        <li>איש קשר: {contact.contactName}</li>
        <li>ח.פ. {COMPANY.taxId}</li>
      </ul>
    </div>
  );
}
