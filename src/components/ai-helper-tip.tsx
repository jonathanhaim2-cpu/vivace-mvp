import { cn } from "@/lib/utils";

type TipLine = {
  label: string;
  text: string;
};

export function AiHelperTip({
  title,
  lines,
  className,
}: {
  title: string;
  lines: TipLine[];
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-primary/25 border-s-[3px] border-s-primary bg-primary/10 px-4 py-3 text-sm",
        className,
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      <dl className="mt-2 grid gap-1.5 text-[13px] leading-relaxed">
        {lines.map((line) => (
          <div key={line.label} className="grid grid-cols-[2.5rem_1fr] gap-2 sm:grid-cols-[2.75rem_1fr]">
            <dt className="font-medium text-primary">{line.label}</dt>
            <dd className="text-muted-foreground">{line.text}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function InvoiceAiTip({
  className,
  variant = "analyze",
}: {
  className?: string;
  variant?: "analyze" | "import";
}) {
  return (
    <AiHelperTip
      className={className}
      title="טיפ · נתח עם AI"
      lines={[
        {
          label: "איך",
          text:
            variant === "import"
              ? "העלו PDF או תמונות לייבוא. הניתוח רץ אוטומטית; במסך החשבוניות אפשר גם «נתח עם AI»."
              : "העלו צילום או קובץ, ואז לחצו «נתח עם AI» (או «העלאה וניתוח»).",
        },
        {
          label: "מה",
          text: "מזהה ספק, תאריך וסכום, ומציע כרטיס הנה״ח עם רמת ביטחון.",
        },
        {
          label: "למה",
          text: "שיבוץ מהיר יותר ל-AP. בביטחון נמוך — שייכו ידנית.",
        },
      ]}
    />
  );
}

export function ReceiptAiTip({ className }: { className?: string }) {
  return (
    <AiHelperTip
      className={className}
      title="טיפ · סריקת תעודה"
      lines={[
        {
          label: "איך",
          text: "צלמו תעודת משלוח מול ההזמנה.",
        },
        {
          label: "מה",
          text: "שולף שם, מק״ט, כמות ומחיר יחידה ומשווה לקטלוג.",
        },
        {
          label: "למה",
          text: "פחות הקלדה ופחות טעויות בקליטה — אשרו כמויות.",
        },
      ]}
    />
  );
}
