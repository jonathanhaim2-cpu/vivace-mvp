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

export function monthRangeUtc(key: string) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
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
