export function ImportSuccessBanner({ count }: { count: number }) {
  const title =
    count === 1 ? "יובאה חשבונית אחת לתור הסיווג" : `יובאו ${count} חשבוניות לתור הסיווג`;

  return (
    <div
      className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm"
      role="status"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">
        המסמכים מחכים למטה תחת{" "}
        <a href="#pending-classification" className="font-medium text-foreground underline-offset-2 hover:underline">
          «ממתינות לסיווג»
        </a>
        .
      </p>
    </div>
  );
}
