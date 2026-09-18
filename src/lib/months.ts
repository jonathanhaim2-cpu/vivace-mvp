const MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export function monthKeyFromDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/** YYYY-MM from an AI-extracted invoice date (YYYY-MM-DD or YYYY-MM). */
export function monthKeyFromInvoiceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

/** Batch override wins; otherwise derive from the invoice date. */
export function resolvedPeriodMonth(
  overrideMonth: string | null | undefined,
  invoiceDate: string | null | undefined,
): string | null {
  const override = overrideMonth?.trim() ?? "";
  if (/^\d{4}-\d{2}$/.test(override)) return override;
  return monthKeyFromInvoiceDate(invoiceDate);
}

export function previousMonthKey(from = new Date()) {
  const [year, month] = monthKeyFromDate(from).split("-").map(Number);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `${prev.year}-${String(prev.month).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone = "Asia/Jerusalem") {
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utc));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(utc - (asIfUtc - utc));
}

/** Calendar month in Asia/Jerusalem, expressed as UTC instants for SQLite DateTime filters. */
export function monthRangeUtc(key: string) {
  const [year, month] = key.split("-").map(Number);
  const start = zonedMidnightUtc(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = zonedMidnightUtc(nextYear, nextMonth, 1);
  return { start, end };
}

/** `all` = no month filter; missing/invalid falls back to current month (or `fallback`). */
export function parseMonthParam(value: string | undefined, fallback: string | null = monthKeyFromDate()) {
  if (value === "all") return null;
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return fallback;
}

export function recentMonthKeys(count = 8) {
  const keys: string[] = [];
  let [year, month] = monthKeyFromDate().split("-").map(Number);
  for (let i = 0; i < count; i += 1) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    if (month === 1) {
      year -= 1;
      month = 12;
    } else {
      month -= 1;
    }
  }
  return keys;
}
