import Link from "next/link";
import { importInboxFiles } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { InvoiceAiTip } from "@/components/ai-helper-tip";
import { BranchSelect } from "@/components/branches/branch-select";
import { NarrowForm, PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { monthLabel, recentMonthKeys } from "@/lib/months";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function InvoiceImportPage() {
  const months = recentMonthKeys();
  const session = await getAppSession();
  const branches = session.branches.map((branch) => ({ id: branch.id, name: branch.name }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="ייבוא מתיקייה"
        description="מעלים כמה חשבוניות בבת אחת. כל קובץ נכנס לתור הסיווג, ו-AI מציע תאריך וקטגוריה לאישור — בלי לבחור מראש לכל האצווה. קובץ זהה או חשבונית עם אותו ספק/תאריך/סכום נכנס ל«כפילויות» ולא נספר בסיכומים."
        action={{ href: "/invoices", label: "לתור הסיווג" }}
      />

      <InvoiceAiTip variant="import" />

      <NarrowForm>
        <CompactPanel
          title="העלאה מרובה"
          description="PDF או תמונות. ריק בחודש/קטגוריה = ה-AI מחלץ מכל מסמך, ואתם מאשרים בתור. אותו קובץ פעמיים לא ייספר פעמיים."
        >
          <CompactForm action={importInboxFiles}>
            <CompactField
              label="קבצים"
              htmlFor="photos"
              grow
              hint="בחירה מרובה מתיקיית ההורדות, כמו מצורפים מתיבת המייל."
            >
              <Input id="photos" name="photos" type="file" accept="image/*,application/pdf" multiple required />
            </CompactField>
            <CompactField label="חודש לדיווח" htmlFor="periodMonth">
              <NativeSelect id="periodMonth" name="periodMonth" defaultValue="">
                <option value="">אוטומטי — לפי תאריך החשבונית</option>
                {months.map((key) => (
                  <option key={key} value={key}>
                    {monthLabel(key)}
                  </option>
                ))}
              </NativeSelect>
            </CompactField>
            <CompactField label="סניף" htmlFor="branchId">
              <BranchSelect
                id="branchId"
                branches={branches}
                defaultValue={session.branchId}
                allowEmpty
                allowNetwork
                emptyLabel="לשיבוץ אחר כך"
              />
            </CompactField>
            <CompactField label="קטגוריה" htmlFor="accountId" className="min-w-[14rem]">
              <GroupedAccountSelect id="accountId" allowEmpty required={false} />
            </CompactField>
            <Button type="submit">ייבוא לתור</Button>
            <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
              לתור הסיווג
            </Link>
          </CompactForm>
        </CompactPanel>
      </NarrowForm>
    </div>
  );
}
