import {
  DOCUMENT_TYPES,
  EXPENSE_CATEGORIES,
  ORDER_STATUSES,
  RECEIPT_STATUSES,
  WEEKDAYS,
} from "@/lib/constants";

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

export function formatDeliveryDays(raw: string) {
  return parseDeliveryDays(raw)
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
    .filter(Boolean)
    .join(", ");
}

export function documentTypeLabel(value: string | null | undefined) {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";
}

export function expenseCategoryLabel(value: string | null | undefined) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "ללא קטגוריה";
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
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dateLabel: `${get("day")}/${get("month")}/${get("year")}`,
  };
}

export function parseCutoffMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
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

export function nextDeliveryInfo(deliveryDays: number[], cutoffTime: string) {
  const now = nowInIsrael();
  const unique = [...new Set(deliveryDays)].sort((a, b) => a - b);
  const cutoff = parseCutoffMinutes(cutoffTime);

  if (unique.length === 0) {
    return {
      open: true,
      label: "אין ימי אספקה מוגדרים",
      daysUntil: 7,
      nextDayLabel: "—",
    };
  }

  const todayIsDelivery = unique.includes(now.day);
  const openToday = todayIsDelivery && now.minutes <= cutoff;
  const daysUntil = daysUntilNextDelivery(unique, now);
  const nextDay = (now.day + (openToday ? 0 : daysUntil)) % 7;
  const nextDayLabel = WEEKDAYS.find((w) => w.value === nextDay)?.label ?? "—";

  if (openToday) {
    return {
      open: true,
      label: `חלון פתוח עד ${cutoffTime} · משלוח היום`,
      daysUntil: Math.max(1, typicalGapDays(unique)),
      nextDayLabel,
    };
  }

  if (todayIsDelivery) {
    return {
      open: false,
      label: `נסגר להיום (${cutoffTime}) · המשלוח הבא: ${nextDayLabel}`,
      daysUntil,
      nextDayLabel,
    };
  }

  return {
    open: true,
    label: `הזמנה למשלוח ביום ${nextDayLabel} · סגירה ב-${cutoffTime}`,
    daysUntil,
    nextDayLabel,
  };
}

export function suggestOrderQty(stockStandard: number, deliveryDays: number[], cutoffTime: string) {
  const window = nextDeliveryInfo(deliveryDays, cutoffTime);
  const gap = typicalGapDays(deliveryDays);
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
