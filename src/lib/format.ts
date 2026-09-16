import { DOCUMENT_TYPES, ORDER_STATUSES, RECEIPT_STATUSES, WEEKDAYS } from "@/lib/constants";
import { accountPathLabel } from "@/lib/chart-of-accounts";

const ILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatIls(value: number) {
  return ILS.format(value);
}

export function formatDate(value: Date | string) {
  return DATE.format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return DATE_TIME.format(new Date(value));
}

export function parseDeliveryDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as number[];
    return parsed.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  } catch {
    return [];
  }
}

export function parseWeekdays(raw: string | null | undefined): number[] {
  return parseDeliveryDays(raw ?? "[]");
}

export function resolveOrderDays(orderDaysRaw: string | null | undefined, deliveryDaysRaw: string) {
  const orderDays = parseWeekdays(orderDaysRaw);
  return orderDays.length > 0 ? orderDays : parseDeliveryDays(deliveryDaysRaw);
}

export function formatWeekdays(days: number[]) {
  return days
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
    .filter(Boolean)
    .join(", ");
}

export function formatDeliveryDays(raw: string) {
  return formatWeekdays(parseDeliveryDays(raw));
}

export function documentTypeLabel(value: string | null | undefined) {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";
}

export function expenseCategoryLabel(value: string | null | undefined) {
  return accountPathLabel(value);
}

export function orderStatusLabel(status: string) {
  switch (status) {
    case ORDER_STATUSES.CONFIRMED:
      return "ממתינה לשליחה";
    case ORDER_STATUSES.SENT:
      return "נשלחה לספק";
    case ORDER_STATUSES.PARTIAL:
      return "נקלטה חלקית";
    case ORDER_STATUSES.RECEIVED:
      return "נקלטה";
    default:
      return status;
  }
}

export function receiptStatusLabel(status: string) {
  switch (status) {
    case RECEIPT_STATUSES.SUBMITTED:
      return "נקלטה";
    case RECEIPT_STATUSES.PENDING_PRICE_APPROVAL:
      return "ממתינה לאישור מחיר";
    case RECEIPT_STATUSES.APPROVED:
      return "אושרה";
    case RECEIPT_STATUSES.CREDIT_NEEDED:
      return "נדרשת בקשת זיכוי";
    default:
      return status;
  }
}

export function lineTotal(qty: number, unitPrice: number, discountPercent: number) {
  return qty * unitPrice * (1 - discountPercent / 100);
}

export function describePackaging(qty: number, cartonToBags?: number | null, bagsToUnits?: number | null) {
  if (!cartonToBags && !bagsToUnits) return null;
  const unitsPerBag = bagsToUnits && bagsToUnits > 0 ? bagsToUnits : 1;
  const bagsPerCarton = cartonToBags && cartonToBags > 0 ? cartonToBags : 0;
  const unitsPerCarton = bagsPerCarton > 0 ? bagsPerCarton * unitsPerBag : 0;

  const parts: string[] = [];
  let remaining = qty;

  if (unitsPerCarton > 0) {
    const cartons = Math.floor(remaining / unitsPerCarton);
    if (cartons > 0) parts.push(`${cartons} קרטונים`);
    remaining = remaining % unitsPerCarton;
  }

  if (unitsPerBag > 1) {
    const bags = Math.floor(remaining / unitsPerBag);
    if (bags > 0) parts.push(`${bags} שקיות`);
    remaining = remaining % unitsPerBag;
  }

  if (remaining > 0 || parts.length === 0) {
    parts.push(`${remaining} יח׳`);
  }

  return parts.join(" + ");
}

export function nowInIsrael() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: weekdayMap[get("weekday")] ?? new Date().getDay(),
    date: Number(get("day")) || 1,
    month: Number(get("month")) || 1,
    year: Number(get("year")) || new Date().getFullYear(),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dateLabel: `${get("day")}/${get("month")}/${get("year")}`,
  };
}

export type IsraelClock = ReturnType<typeof nowInIsrael>;

export function addCalendarDays(year: number, month: number, date: number, days: number) {
  const utc = new Date(Date.UTC(year, month - 1, date + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    date: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

export function formatIsraelDayLabel(year: number, month: number, date: number) {
  return `${String(date).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** LTR mark so "14:00" does not render as "00:14" in Hebrew RTL. */
const LRM = "\u200E";

export function normalizeClockTime(raw: string | null | undefined) {
  const trimmed = String(raw ?? "").trim();
  const match = trimmed.match(/^(\d{1,2})[:.hH](\d{2})$/);
  if (!match) {
    const compact = trimmed.match(/^(\d{1,2})(\d{2})$/);
    if (!compact) return "14:00";
    const h = Number(compact[1]);
    const m = Number(compact[2]);
    if (h > 23 || m > 59) return "14:00";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return "14:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Display-safe HH:MM (bidi-isolated) for RTL text. */
export function formatClockTime(raw: string | null | undefined) {
  const value = normalizeClockTime(raw);
  return `${LRM}${value}${LRM}`;
}

export function parseCutoffMinutes(hhmm: string) {
  const normalized = normalizeClockTime(hhmm);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 14 * 60;
  return h * 60 + m;
}

export function typicalGapDays(deliveryDays: number[]) {
  const unique = [...new Set(deliveryDays)].sort((a, b) => a - b);
  if (unique.length === 0) return 7;
  return 7 / unique.length;
}

export function daysUntilNextDelivery(deliveryDays: number[], from = nowInIsrael()) {
  const unique = [...new Set(deliveryDays)].sort((a, b) => a - b);
  if (unique.length === 0) return 7;

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = (from.day + offset) % 7;
    if (!unique.includes(day)) continue;
    if (offset === 0 && from.minutes > parseCutoffMinutes("23:59")) continue;
    return offset === 0 ? 1 : offset;
  }
  return 7;
}

export function nextDeliveryInfo(deliveryDays: number[], cutoffTime: string, orderDays?: number[]) {
  const now = nowInIsrael();
  const uniqueDelivery = [...new Set(deliveryDays)].sort((a, b) => a - b);
  const uniqueOrder = [...new Set(orderDays && orderDays.length > 0 ? orderDays : deliveryDays)].sort(
    (a, b) => a - b,
  );
  const cutoff = parseCutoffMinutes(cutoffTime);
  const clock = formatClockTime(cutoffTime);
  const orderLabel = formatWeekdays(uniqueOrder);
  const deliveryLabel = formatWeekdays(uniqueDelivery);

  if (uniqueDelivery.length === 0 && uniqueOrder.length === 0) {
    return {
      open: true,
      label: "אין ימי הזמנה או אספקה מוגדרים",
      daysUntil: 7,
      nextDayLabel: "—",
    };
  }

  const todayIsOrderDay = uniqueOrder.includes(now.day);
  const openToday = todayIsOrderDay && now.minutes <= cutoff;
  const schedule = uniqueDelivery.length > 0 ? uniqueDelivery : uniqueOrder;
  const daysUntil = daysUntilNextDelivery(schedule, now);
  const nextDay = (now.day + (openToday ? 0 : daysUntil)) % 7;
  const nextDayLabel = WEEKDAYS.find((w) => w.value === nextDay)?.label ?? "—";

  if (openToday) {
    return {
      open: true,
      label: `חלון הזמנה פתוח עד ${clock} · ימי הזמנה: ${orderLabel || "—"} · אספקה: ${deliveryLabel || nextDayLabel}`,
      daysUntil: Math.max(1, typicalGapDays(schedule)),
      nextDayLabel,
    };
  }

  if (todayIsOrderDay) {
    return {
      open: false,
      label: `נסגר להיום (${clock}) · ימי הזמנה: ${orderLabel || "—"} · אספקה: ${deliveryLabel || nextDayLabel}`,
      daysUntil,
      nextDayLabel,
    };
  }

  return {
    open: true,
    label: `הזמנה למשלוח ביום ${nextDayLabel} · סגירה ב-${clock} · ימי הזמנה: ${orderLabel || "—"} · אספקה: ${deliveryLabel || "—"}`,
    daysUntil,
    nextDayLabel,
  };
}

export type NextOrderWindow = {
  open: boolean;
  missedToday: boolean;
  daysUntil: number;
  weekdayLabel: string;
  dateLabel: string;
  cutoffLabel: string;
  label: string;
  warning: string | null;
  reminderDue: boolean;
  minutesLeft: number | null;
};

/** Next calendar order slot from order-days + cutoff (not delivery days). */
export function nextOrderWindow(
  orderDays: number[],
  cutoffTime: string,
  reminderHoursBefore = 2,
  from: IsraelClock = nowInIsrael(),
): NextOrderWindow {
  const unique = [...new Set(orderDays)].sort((a, b) => a - b);
  const cutoff = parseCutoffMinutes(cutoffTime);
  const clock = formatClockTime(cutoffTime);
  const empty: NextOrderWindow = {
    open: true,
    missedToday: false,
    daysUntil: 7,
    weekdayLabel: "—",
    dateLabel: "—",
    cutoffLabel: clock,
    label: "אין ימי הזמנה מוגדרים",
    warning: null,
    reminderDue: false,
    minutesLeft: null,
  };
  if (unique.length === 0) return empty;

  const missedToday = unique.includes(from.day) && from.minutes > cutoff;
  const minutesLeftToday = unique.includes(from.day) && from.minutes <= cutoff ? cutoff - from.minutes : null;
  const reminderWindow = Math.max(1, reminderHoursBefore) * 60;
  const reminderDue =
    minutesLeftToday != null && minutesLeftToday > 0 && minutesLeftToday <= reminderWindow;

  for (let offset = 0; offset <= 14; offset += 1) {
    const weekday = (from.day + offset) % 7;
    if (!unique.includes(weekday)) continue;
    if (offset === 0 && from.minutes > cutoff) continue;

    const cal = addCalendarDays(from.year, from.month, from.date, offset);
    const dateLabel = formatIsraelDayLabel(cal.year, cal.month, cal.date);
    const weekdayLabel = WEEKDAYS.find((w) => w.value === weekday)?.label ?? "—";
    const weekish = offset >= 6;

    let warning: string | null = null;
    if (missedToday && weekish) {
      warning = "שים לב, ההזמנה הבאה לספק רק בעוד שבוע";
    } else if (missedToday) {
      warning = `שים לב, עברתם את שעת הסגירה. ההזמנה הבאה בעוד ${offset} ימים`;
    } else if (weekish && offset > 0) {
      warning = "שים לב, ההזמנה הבאה לספק רק בעוד שבוע";
    }

    const label =
      offset === 0
        ? `ההזמנה הקרובה: היום, ${weekdayLabel} ${dateLabel} · עד ${clock}`
        : `ההזמנה הקרובה: ${weekdayLabel} ${dateLabel} · סגירה ב-${clock}`;

    return {
      open: offset === 0,
      missedToday,
      daysUntil: offset,
      weekdayLabel,
      dateLabel,
      cutoffLabel: clock,
      label,
      warning,
      reminderDue,
      minutesLeft: offset === 0 ? minutesLeftToday : null,
    };
  }

  return { ...empty, missedToday, open: false, label: `נסגר להיום (${clock})` };
}

export function suggestOrderQty(
  stockStandard: number,
  deliveryDays: number[],
  cutoffTime: string,
  orderDays?: number[],
) {
  const window = nextDeliveryInfo(deliveryDays, cutoffTime, orderDays);
  const gap = typicalGapDays(deliveryDays.length > 0 ? deliveryDays : orderDays ?? []);
  const factor = Math.max(1, window.daysUntil / gap);
  return Math.max(1, Math.ceil(stockStandard * factor));
}

export function startOfIsraelWeek() {
  const now = new Date();
  const israel = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const day = israel.getDay();
  israel.setHours(0, 0, 0, 0);
  israel.setDate(israel.getDate() - day);
  return israel;
}
