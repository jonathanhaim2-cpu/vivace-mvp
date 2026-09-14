import * as XLSX from "xlsx";

export type ImportedProductRow = {
  name: string;
  sku: string | null;
  agreedPrice: number;
  discountPercent: number;
  vatIncluded: boolean;
  cartonToBags: number | null;
  bagsToUnits: number | null;
};

const NAME_KEYS = [
  "name",
  "שם",
  "שםמוצר",
  "שםהמוצר",
  "שםפריט",
  "תיאור",
  "תיאורפריט",
  "תאור",
  "תאורפריט",
  "פריט",
  "מוצר",
  "product",
  "item",
  "itemname",
  "productname",
  "description",
  "desc",
  "כינוי",
];
const SKU_KEYS = [
  "sku",
  "מקט",
  "מקטהמוצר",
  "מק״ט",
  'מק"ט',
  "מק(ט",
  "קוד",
  "קודפריט",
  "קודמוצר",
  "barcode",
  "ברקוד",
  "code",
  "itemcode",
];
const PRICE_KEYS = [
  "price",
  "מחיר",
  "agreedprice",
  "unitprice",
  "מחירלפנימעמ",
  "מחירלפנימע״מ",
  "מחירליח",
  "מחירעלות",
  "מחירמכירה",
  "מחיריחידה",
  "cost",
  "עלות",
];
const DISCOUNT_KEYS = ["discount", "הנחה", "discountpercent", "אחוזהנחה", "הנחה%"];
const VAT_EXEMPT_KEYS = ["פטורממעמ", 'פטורממע"מ', "vat", "vatincluded", "מע״מ", "מעמ"];
const CARTON_KEYS = ["carton", "קרטון", "cartontobags"];
const BAGS_KEYS = ["bags", "יחידות", "bagstounits", "pack", "כמותבמארז", "כמותבאריזה"];
const SKIP_NAMES = new Set(["סהכ", 'סה"כ', "סה״כ", "סיכום", "total", "totals", "sum", ""]);

function normalizeHeader(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[״""']/g, '"')
    .replace(/[_-]+/g, "")
    .toLowerCase();
}

function cell(row: Record<string, unknown>, keys: string[]) {
  const map = new Map(Object.keys(row).map((key) => [normalizeHeader(key), row[key]]));
  for (const key of keys) {
    const value = map.get(normalizeHeader(key));
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  for (const [header, value] of map.entries()) {
    if (keys.some((key) => header.includes(normalizeHeader(key)) || normalizeHeader(key).includes(header))) {
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
  }
  return "";
}

function num(raw: string, fallback = 0) {
  const n = Number(String(raw).replace(/[^\d.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function looksLikeSkipName(name: string) {
  return SKIP_NAMES.has(normalizeHeader(name));
}

function fallbackName(row: Record<string, unknown>, usedAsSku: string) {
  const texts = Object.values(row)
    .map((value) => String(value ?? "").trim())
    .filter((value) => value && !looksLikeSkipName(value) && !/^\d+([.,]\d+)?$/.test(value));
  const hebrew = texts.filter((value) => /[\u0590-\u05FF]/.test(value));
  const candidates = (hebrew.length > 0 ? hebrew : texts).filter((value) => value !== usedAsSku);
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? "";
}

export function parseProductRow(row: Record<string, unknown>): ImportedProductRow | null {
  let name = cell(row, NAME_KEYS);
  const sku = cell(row, SKU_KEYS) || null;
  if (!name) name = fallbackName(row, sku ?? "");
  if (!name || looksLikeSkipName(name)) return null;
  const price = num(cell(row, PRICE_KEYS));
  const exemptRaw = cell(row, VAT_EXEMPT_KEYS).toLowerCase();
  const vatIncluded = !["כן", "yes", "true", "1", "פטור"].includes(exemptRaw);
  return {
    name,
    sku,
    agreedPrice: price,
    discountPercent: num(cell(row, DISCOUNT_KEYS)),
    vatIncluded,
    cartonToBags: cell(row, CARTON_KEYS) ? num(cell(row, CARTON_KEYS)) : null,
    bagsToUnits: cell(row, BAGS_KEYS) ? num(cell(row, BAGS_KEYS)) : null,
  };
}

function isHeaderRow(cells: unknown[]) {
  const texts = cells.map((cellValue) => normalizeHeader(String(cellValue ?? "")));
  const hit = (keys: string[]) =>
    texts.some((text) => keys.some((key) => text === normalizeHeader(key) || text.includes(normalizeHeader(key))));
  return hit(NAME_KEYS) || hit(SKU_KEYS) || hit(PRICE_KEYS);
}

function rowsFromAoA(matrix: unknown[][]): Record<string, unknown>[] {
  if (matrix.length === 0) return [];
  let headerIndex = matrix.findIndex((row) => isHeaderRow(row ?? []));
  if (headerIndex < 0) headerIndex = 0;
  const headers = (matrix[headerIndex] ?? []).map((cellValue, index) => {
    const label = String(cellValue ?? "").trim();
    return label || `col_${index}`;
  });
  const body = matrix.slice(headerIndex + 1);
  return body
    .filter((row) => (row ?? []).some((cellValue) => String(cellValue ?? "").trim() !== ""))
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = row?.[index] ?? "";
      });
      return record;
    });
}

function decodeCsv(buffer: Buffer) {
  const bom = buffer.subarray(0, 3).toString("hex") === "efbbbf";
  const utf8 = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length;
  const hasHebrew = /[\u0590-\u05FF]/.test(utf8);
  if (bom || (hasHebrew && replacementCount === 0)) return utf8;
  try {
    const decoded = new TextDecoder("windows-1255").decode(buffer);
    if (/[\u0590-\u05FF]/.test(decoded)) return decoded;
  } catch {
    /* ignore */
  }
  return utf8;
}

export function parseProductRecords(rows: Record<string, unknown>[]): ImportedProductRow[] {
  return rows.map(parseProductRow).filter((row): row is ImportedProductRow => row != null);
}

export function parseProductSpreadsheet(buffer: Buffer, fileName: string): ImportedProductRow[] {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCsv
    ? XLSX.read(decodeCsv(buffer), { type: "string", raw: false })
    : XLSX.read(buffer, { type: "buffer", raw: false, cellDates: false });

  const collected: ImportedProductRow[] = [];
  const seen = new Set<string>();
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const records = rowsFromAoA(matrix);
    for (const row of parseProductRecords(records)) {
      const key = `${row.sku ?? ""}::${row.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(row);
    }
    if (collected.length > 0) break;
  }
  return collected;
}
