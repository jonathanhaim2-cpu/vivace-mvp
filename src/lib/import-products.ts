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

const NAME_KEYS = ["name", "שם", "שם מוצר", "product", "item"];
const SKU_KEYS = ["sku", "מקט", "מק״ט", "מק\"ט", "barcode"];
const PRICE_KEYS = ["price", "מחיר", "agreedprice", "unitprice", "מחיר לפני מעמ", "מחיר לפני מע״מ"];
const DISCOUNT_KEYS = ["discount", "הנחה", "discountpercent", "הנחה %"];
const VAT_KEYS = ["vat", "מע״מ", "מעמ", "vatincluded"];
const CARTON_KEYS = ["carton", "קרטון", "cartontobags"];
const BAGS_KEYS = ["bags", "יחידות", "bagstounits", "pack"];

function cell(row: Record<string, unknown>, keys: string[]) {
  const map = new Map(Object.keys(row).map((key) => [normalizeHeader(key), row[key]]));
  for (const key of keys) {
    const value = map.get(normalizeHeader(key));
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").replace(/[״"]/g, '"').toLowerCase();
}

function num(raw: string, fallback = 0) {
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function parseRow(row: Record<string, unknown>): ImportedProductRow | null {
  const name = cell(row, NAME_KEYS);
  if (!name) return null;
  const price = num(cell(row, PRICE_KEYS));
  const vatRaw = cell(row, VAT_KEYS).toLowerCase();
  const vatIncluded = vatRaw === "" ? true : !["0", "false", "לא", "no", "ללא"].includes(vatRaw);
  return {
    name,
    sku: cell(row, SKU_KEYS) || null,
    agreedPrice: price,
    discountPercent: num(cell(row, DISCOUNT_KEYS)),
    vatIncluded,
    cartonToBags: cell(row, CARTON_KEYS) ? num(cell(row, CARTON_KEYS)) : null,
    bagsToUnits: cell(row, BAGS_KEYS) ? num(cell(row, BAGS_KEYS)) : null,
  };
}

export function parseProductSpreadsheet(buffer: Buffer, fileName: string): ImportedProductRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const parsed = rows.map(parseRow).filter((row): row is ImportedProductRow => row != null);
  if (parsed.length === 0 && fileName.toLowerCase().endsWith(".csv")) {
    return parsed;
  }
  return parsed;
}
