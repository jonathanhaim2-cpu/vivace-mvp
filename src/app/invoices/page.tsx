import Link from "next/link";
import { uploadStandaloneInvoice } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { InvoiceAiTip } from "@/components/ai-helper-tip";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { BranchSelect } from "@/components/branches/branch-select";
import { DocumentTypeSelect } from "@/components/invoices/document-type-control";
import { InvoiceCaptureField } from "@/components/invoices/invoice-capture-field";
import { ClassifiedInvoiceTable } from "@/components/invoices/classified-invoice-table";
import { DuplicateInvoiceCard } from "@/components/invoices/duplicate-invoice-card";
import { ImportSuccessBanner } from "@/components/invoices/import-success-banner";
import { InvoiceFilterBar } from "@/components/invoices/invoice-filter-bar";
import { MobileInvoiceScreen } from "@/components/invoices/mobile-invoice-screen";
import { PendingInvoiceCard } from "@/components/invoices/pending-invoice-card";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { getAiRuntime } from "@/lib/ai";
import { firstAuditsFor, formatAuditStamp, INVOICE_ORIGIN_ACTIONS } from "@/lib/audit";
import { scanExistingInvoiceDuplicates } from "@/lib/invoice-duplicates";
import { formatIls } from "@/lib/format";
import {
  invoicesFilterQuery,
  matchesClassifiedFilters,
  matchesInvoiceList,
  matchesPendingFilters,
  parseInvoiceFilters,
  photoDateKey,
  photoPeriodMonth,
  photoSupplierName,
  uniquePeriodMonths,
  uniqueSupplierNames,
  type InvoiceFilterPhoto,
} from "@/lib/invoice-filters";
import {
  deriveInvoiceListStatus,
  invoiceDocumentNumber,
  invoiceGroupLabel,
  isAwaitingTreatment,
  shortInvoiceDate,
} from "@/lib/invoice-list-status";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { resolvedInvoiceBranchId } from "@/lib/purchase-fill";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function importedCountFromParam(imported: string | undefined) {
  if (!imported || !/^\d+$/.test(imported)) return 0;
  return Number(imported);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    dup?: string;
    month?: string;
    from?: string;
    to?: string;
    category?: string;
    supplier?: string;
    status?: string;
    q?: string;
    branch?: string;
    documentType?: string;
    queue?: string;
  }>;
}) {
  await scanExistingInvoiceDuplicates();
  const params = await searchParams;
  const importedCount = importedCountFromParam(params.imported);
  const duplicateNotice = Number.parseInt(params.dup ?? "", 10);
  const aiDuplicateNotice = params.dup === "ai";
  const filters = parseInvoiceFilters(params);
  const queue = params.queue === "1";
  const returnTo = invoicesFilterQuery(filters);
  const session = await getAppSession();
  const branches = session.branches.map((branch) => ({ id: branch.id, name: branch.name }));

  const [photos, runtime] = await Promise.all([
    prisma.invoicePhoto.findMany({
      include: {
        account: { include: { parent: true } },
        branch: true,
        goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
        duplicateOf: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getAiRuntime(),
  ]);
  const invoiceActors = await firstAuditsFor(
    "InvoicePhoto",
    photos.map((photo) => photo.id),
    [...INVOICE_ORIGIN_ACTIONS],
  );
  const stampFor = (id: string) => formatAuditStamp(invoiceActors.get(id));

  const duplicates = photos.filter((photo) => photo.isDuplicate);
  const uniquePhotos = photos.filter((photo) => !photo.isDuplicate);
  const filterPhotos: InvoiceFilterPhoto[] = uniquePhotos.map((photo) => ({
    accountId: photo.accountId,
    originalName: photo.originalName,
    fileName: photo.fileName,
    periodMonth: photo.periodMonth,
    createdAt: photo.createdAt,
    amountIls: photo.amountIls,
    aiTotalIls: photo.aiTotalIls,
    aiInvoiceDate: photo.aiInvoiceDate,
    aiSupplierName: photo.aiSupplierName,
    supplierName: photo.goodsReceipt?.order.supplier.name ?? null,
    branchId: resolvedInvoiceBranchId(photo),
    documentType: photo.documentType,
    approvalStatus: photo.approvalStatus,
    aiNetworkExpense: photo.aiNetworkExpense,
  }));

  const pending = uniquePhotos.filter((_, index) => matchesPendingFilters(filterPhotos[index], filters));
  const classified = uniquePhotos.filter((_, index) => matchesClassifiedFilters(filterPhotos[index], filters));
  const classifiedTotal = uniquePhotos.filter((photo) => photo.accountId).length;
  const months = uniquePeriodMonths(filterPhotos, recentMonthKeys());
  const suppliers = uniqueSupplierNames(filterPhotos);
  const monthOptions = recentMonthKeys();
  const monthSummary = filters.month === "all" ? "כל החודשים" : monthLabel(filters.month);
  const todayKey = photoDateKey({ createdAt: new Date(), aiInvoiceDate: null });
  const indexed = uniquePhotos.map((photo, index) => ({ photo, filter: filterPhotos[index]! }));
  const queueCount = indexed.filter(
    ({ filter }) => matchesInvoiceList(filter, { ...filters, status: "all" }) && isAwaitingTreatment(filter),
  ).length;
  const visible = indexed
    .filter(({ filter }) => matchesInvoiceList(filter, filters) && (!queue || isAwaitingTreatment(filter)))
    .sort((a, b) => {
      const byDate = photoDateKey(b.filter).localeCompare(photoDateKey(a.filter));
      if (byDate !== 0) return byDate;
      return b.photo.createdAt.getTime() - a.photo.createdAt.getTime();
    });
  const visibleAmount = visible.reduce((sum, { photo }) => sum + (photo.amountIls ?? photo.aiTotalIls ?? 0), 0);
  const mobileRows = visible.map(({ photo, filter }) => {
    const dateKey = photoDateKey(filter);
    const branchId = filter.branchId;
    return {
      id: photo.id,
      supplier: photoSupplierName(filter) || "ללא שם ספק",
      meta: `${shortInvoiceDate(dateKey)} · ${invoiceDocumentNumber(photo.originalName)}`,
      amount: (photo.amountIls ?? photo.aiTotalIls) != null ? formatIls((photo.amountIls ?? photo.aiTotalIls) as number) : "—",
      status: deriveInvoiceListStatus({
        accountId: photo.accountId,
        branchId,
        approvalStatus: photo.approvalStatus,
        aiNetworkExpense: photo.aiNetworkExpense,
      }),
      group: invoiceGroupLabel(dateKey, todayKey),
    };
  });
  const uploadFields = (idPrefix: string) => (
    <InvoiceUploadFields
      idPrefix={idPrefix}
      branches={branches}
      branchId={session.branchId}
      monthOptions={monthOptions}
    />
  );

  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <PageHeader
          title="חשבוניות וסיווג"
          description="שיבוץ לקטגוריה בתבנית הנה״ח של יונתן. האב נמדד בדוח ובחבילת רואה החשבון."
        />
      </div>

      {importedCount > 0 ? <ImportSuccessBanner count={importedCount} /> : null}
      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}
      <div className="hidden lg:block">
        <InvoiceAiTip />
      </div>

      <div className="lg:hidden">
        <MobileInvoiceScreen
          filters={filters}
          queue={queue}
          totalCount={uniquePhotos.length}
          summary={`${formatIls(visibleAmount)} · ${visible.length} מסמכים`}
          queueCount={queueCount}
          rows={mobileRows}
          suppliers={suppliers}
          branches={branches}
          upload={uploadFields("mobile")}
          returnTo={queue ? `${invoicesFilterQuery(filters)}${invoicesFilterQuery(filters).includes("?") ? "&" : "?"}queue=1` : invoicesFilterQuery(filters)}
        />
      </div>

      {aiDuplicateNotice ? (
        <Alert>
          <AlertTitle>זוהתה כפילות</AlertTitle>
          <AlertDescription>
            הניתוח זיהה שהמסמך כבר קיים. הוא הועבר ל<a href="#duplicates">«כפילויות»</a> ולא נספר בסיכומים.
          </AlertDescription>
        </Alert>
      ) : Number.isFinite(duplicateNotice) && duplicateNotice > 0 ? (
        <Alert>
          <AlertTitle>כפילות — לא יובא שוב</AlertTitle>
          <AlertDescription>
            {duplicateNotice === 1
              ? "הקובץ כבר קיים במערכת. הוא נשמר ב«כפילויות» ולא נספר בסיכומי כרטיסים או בחבילת הנה״ח."
              : `${duplicateNotice} קבצים כבר קיימים. הם נשמרו ב«כפילויות» ולא נספרים בסיכומים.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden flex-wrap gap-2 lg:flex">
        <Link href="/invoices/import" className={cn(buttonVariants({ variant: "outline" }))}>
          ייבוא מתיקייה
        </Link>
        <Link href="/invoices/mail" className={cn(buttonVariants({ variant: "outline" }))}>
          חיבור מייל
        </Link>
        <Link href="/invoices/package" className={cn(buttonVariants({ variant: "outline" }))}>
          חבילה להנה״ח
        </Link>
      </div>

      <CompactPanel
        className="hidden lg:block"
        title="סינון מסמכים"
        description="קודם בוחרים סינון (חודש, תאריך, קטגוריה, סוג מסמך, סטטוס, חיפוש) — ואז רואים רשימה קומפקטית. תמונה רק בלחיצה על «תצוגה»."
      >
        <InvoiceFilterBar filters={filters} months={months} suppliers={suppliers} branches={branches} />
      </CompactPanel>

      {pending.length > 0 ? (
        <Card id="pending-classification" className="hidden scroll-mt-24 lg:block">
          <CardHeader>
            <CardTitle>ממתינות לסיווג · {pending.length}</CardTitle>
            <CardDescription>
              ייבוא והעלאה בלי קטגוריה נכנסים לכאן — גם אם תאריך ה-AI בחודש אחר. רואים את המסמך, מאשרים הצעת AI, או ממלאים תאריך/ספק/סכום ומשבצים ידנית.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.map((photo) => (
              <PendingInvoiceCard
                key={photo.id}
                photo={{ ...photo, branchId: resolvedInvoiceBranchId(photo) }}
                months={monthOptions}
                branches={branches}
                auditStamp={stampFor(photo.id)}
                returnTo={returnTo}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {duplicates.length > 0 ? (
        <Card id="duplicates" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>כפילויות · {duplicates.length}</CardTitle>
            <CardDescription>
              חשודים כהעתק של מסמך שכבר יובא. לא נספרים בכרטיסים, בדוח החודשי או בחבילת רואה החשבון עד שתאשרו שהם ייחודיים.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicates.map((photo) => (
              <DuplicateInvoiceCard key={photo.id} photo={photo} auditStamp={stampFor(photo.id)} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <CompactPanel
        className="hidden lg:block"
        title="מסמכים משובצים"
        description={`${classified.length} תוצאות · ${monthSummary}${
          filters.from || filters.to ? ` · ${filters.from || "…"}–${filters.to || "…"}` : ""
        }${classifiedTotal > 0 ? ` · ${classifiedTotal} משובצים במערכת` : ""}`}
      >
        <ClassifiedInvoiceTable
          rows={classified.map((photo) => ({
            id: photo.id,
            originalName: photo.originalName,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            createdAt: photo.createdAt,
            periodMonth: photoPeriodMonth({
              periodMonth: photo.periodMonth,
              createdAt: photo.createdAt,
              aiInvoiceDate: photo.aiInvoiceDate,
            }),
            accountId: photo.accountId as string,
            amountIls: photo.amountIls,
            aiTotalIls: photo.aiTotalIls,
            aiConfidence: photo.aiConfidence,
            aiStatus: photo.aiStatus,
            supplierName: photoSupplierName({
              supplierName: photo.goodsReceipt?.order.supplier.name ?? null,
              aiSupplierName: photo.aiSupplierName,
            }),
            auditStamp: stampFor(photo.id),
            branchId: resolvedInvoiceBranchId(photo),
            branchName: photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? null,
            documentType: photo.documentType,
            paid: photo.paid,
            sentToAccountant: photo.sentToAccountant,
            vatIncluded: photo.vatIncluded,
            amountExVat: photo.amountExVat,
            vatAmount: photo.vatAmount,
          }))}
          branches={branches}
          emptyTitle={classifiedTotal === 0 ? "אין חשבוניות משובצות" : "אין תוצאות לסינון"}
          emptyDescription={
            classifiedTotal === 0
              ? "העלו או ייבאו מסמך ושייכו לקטגוריה."
              : "שנו חודש, תאריך, קטגוריה, סוג מסמך או חיפוש — או אפסו לחודש הנוכחי."
          }
        />
      </CompactPanel>

      <CompactPanel className="hidden lg:block" title="העלאה + ניתוח" description="צלמו או בחרו קובץ. סניף נכנס לאחוז רכש מול מחזור; רשת = הוצאה רשתית בלי לספור בסניף.">
        {uploadFields("desktop")}
      </CompactPanel>

    </div>
  );
}

function InvoiceUploadFields({
  idPrefix,
  branches,
  branchId,
  monthOptions,
}: {
  idPrefix: string;
  branches: { id: string; name: string }[];
  branchId: string | null;
  monthOptions: string[];
}) {
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  return (
    <CompactForm action={uploadStandaloneInvoice}>
      <CompactField label="קטגוריה" htmlFor={fieldId("accountId")} className="min-w-[14rem]">
        <GroupedAccountSelect id={fieldId("accountId")} defaultValue="" allowEmpty required={false} />
      </CompactField>
      <CompactField label="סניף" htmlFor={fieldId("branchId")}>
        <BranchSelect
          id={fieldId("branchId")}
          branches={branches}
          defaultValue={branchId}
          required={branches.length > 0}
          allowEmpty={branches.length === 0}
          allowNetwork
        />
      </CompactField>
      <div className="min-w-[16rem] flex-1">
        <InvoiceCaptureField compact required idPrefix={idPrefix} />
      </div>
      <CompactField label="סוג מסמך" htmlFor={fieldId("documentType")}>
        <DocumentTypeSelect id={fieldId("documentType")} />
      </CompactField>
      <CompactField label="מע״מ" htmlFor={fieldId("vatIncluded")}>
        <NativeSelect id={fieldId("vatIncluded")} name="vatIncluded" defaultValue="incl">
          <option value="incl">כולל מע״מ</option>
          <option value="ex">לפני מע״מ</option>
        </NativeSelect>
      </CompactField>
      <CompactField label="חודש לדיווח" htmlFor={fieldId("periodMonth")}>
        <NativeSelect id={fieldId("periodMonth")} name="periodMonth" defaultValue={monthKeyFromDate()}>
          {monthOptions.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </NativeSelect>
      </CompactField>
      <CompactField label="סכום (₪, זיכוי במינוס)" htmlFor={fieldId("amountIls")}>
        <Input id={fieldId("amountIls")} name="amountIls" type="number" step="0.01" />
      </CompactField>
      <CompactField label="הערה" htmlFor={fieldId("voiceNoteText")} grow>
        <Input id={fieldId("voiceNoteText")} name="voiceNoteText" placeholder="למשל: ירקות השרון אוגוסט" />
      </CompactField>
      <Button type="submit">העלאה וניתוח</Button>
    </CompactForm>
  );
}
