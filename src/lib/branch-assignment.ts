import { mapAiBranchHint, NETWORK_BRANCH_VALUE, type KnownBranch } from "@/lib/invoice-branch";
import { BRANCH_BEIT_SHEMESH, REAL_SUPPLIER_DETAILS } from "@/lib/supplier-details";

export type IngestBranchSource = "delivery-point" | "ship-to" | "supplier" | "city" | "ai" | "none";

export type IngestBranchChoice = {
  branchId: string | null;
  network: boolean;
  source: IngestBranchSource;
};

const SHIP_MARKERS = [
  "יעד משלוח",
  "כתובת למשלוח",
  "כתובת אספקה",
  "משלוח ל",
  "לסניף",
  "נקודת חלוקה",
  "נקודת מכירה",
  "ship to",
  "deliver to",
];

export type DeliveryPointIndex = {
  unique: { code: string; branchId: string }[];
  ambiguous: string[];
};

/** Point-of-sale numbers that belong to one branch only. Shared codes (e.g. 884265) stay ambiguous. */
export function deliveryPointIndex(
  details: typeof REAL_SUPPLIER_DETAILS = REAL_SUPPLIER_DETAILS,
): DeliveryPointIndex {
  const map = new Map<string, Set<string>>();
  for (const overlay of Object.values(details)) {
    for (const [branchId, extra] of Object.entries(overlay.branchOverrides ?? {})) {
      const code = extra?.deliveryPointNumber?.trim();
      if (!code) continue;
      const set = map.get(code) ?? new Set<string>();
      set.add(branchId);
      map.set(code, set);
    }
  }
  const unique: { code: string; branchId: string }[] = [];
  const ambiguous: string[] = [];
  for (const [code, set] of map) {
    if (set.size === 1) unique.push({ code, branchId: [...set][0] });
    else ambiguous.push(code);
  }
  return { unique, ambiguous };
}

export function exclusiveSupplierHints(
  details: Record<string, { name?: string; branchIds?: string[] }> = REAL_SUPPLIER_DETAILS,
) {
  return Object.values(details)
    .filter((overlay) => overlay.branchIds?.length === 1 && overlay.name)
    .map((overlay) => ({ name: overlay.name as string, branchId: overlay.branchIds![0] }));
}

function shipToSlice(text: string) {
  const lower = text.toLowerCase();
  const parts: string[] = [];
  for (const marker of SHIP_MARKERS) {
    let from = 0;
    const needle = marker.toLowerCase();
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      parts.push(text.slice(idx, idx + 120));
      from = idx + needle.length;
    }
  }
  return parts.join("\n");
}

function codesIn(text: string) {
  return text.match(/\d{5,8}/g) ?? [];
}

/**
 * Document evidence only. Never falls back to the signed-in branch.
 * Ship-to / unique delivery point beat a letterhead city (the עוסק is often בית שמש
 * even when the goods go to קרית יערים).
 */
export function chooseIngestBranch(input: {
  documentText: string;
  branches: KnownBranch[];
  aiHint?: string | null;
  points?: DeliveryPointIndex;
  suppliers?: { name: string; branchId: string }[];
}): IngestBranchChoice {
  const text = input.documentText ?? "";
  const branches = input.branches;
  const points = input.points ?? deliveryPointIndex();
  const suppliers = input.suppliers ?? exclusiveSupplierHints();

  const seen = new Set<string>();
  for (const code of codesIn(text)) {
    if (points.ambiguous.includes(code)) continue;
    const hit = points.unique.find((row) => row.code === code);
    if (!hit) continue;
    seen.add(hit.branchId);
  }
  if (seen.size === 1) return { branchId: [...seen][0], network: false, source: "delivery-point" };

  const ship = shipToSlice(text);
  if (ship) {
    const mapped = mapAiBranchHint(ship, branches);
    if (mapped.branchId) return { branchId: mapped.branchId, network: false, source: "ship-to" };
  }

  const supplierHits = new Set<string>();
  for (const supplier of suppliers) {
    if (supplier.name && text.includes(supplier.name)) supplierHits.add(supplier.branchId);
  }
  if (supplierHits.size === 1) return { branchId: [...supplierHits][0], network: false, source: "supplier" };

  const city = mapAiBranchHint(text, branches);
  if (city.branchId) return { branchId: city.branchId, network: false, source: "city" };
  if (city.network) return { branchId: null, network: true, source: "city" };

  const ai = mapAiBranchHint(input.aiHint, branches);
  if (ai.branchId || ai.network) return { branchId: ai.branchId, network: ai.network, source: "ai" };
  return { branchId: null, network: false, source: "none" };
}

/**
 * Active branch for the session cookie.
 * Network users with no explicit branch are משרד רשת — not branches[0] (בית שמש).
 * That default was stamping Kiryat Ye'arim orders and invoices onto Beit Shemesh.
 */
export function selectSessionBranch(input: {
  isNetwork: boolean;
  requested: string | null | undefined;
  branches: { id: string }[];
}): string | null {
  const requested = input.requested?.trim() || "";
  if (input.isNetwork && (!requested || requested === NETWORK_BRANCH_VALUE)) return null;
  const found = input.branches.find((branch) => branch.id === requested);
  if (found) return found.id;
  if (input.isNetwork) return null;
  return input.branches[0]?.id ?? null;
}

/** Explicit form branch, else the order being duplicated, else the session. Never invents בית שמש. */
export function resolveOrderBranchId(input: {
  explicitBranchId?: string | null;
  sourceOrderBranchId?: string | null;
  sessionBranchId?: string | null;
}): string | null {
  const explicit = input.explicitBranchId?.trim() || "";
  if (explicit && explicit !== NETWORK_BRANCH_VALUE) return explicit;
  const source = input.sourceOrderBranchId?.trim();
  if (source) return source;
  const session = input.sessionBranchId?.trim();
  return session || null;
}

export function branchConflict(storedBranchId: string | null | undefined, choice: IngestBranchChoice) {
  if (!choice.branchId || choice.network) return false;
  if (!storedBranchId) return true;
  return storedBranchId !== choice.branchId;
}

export function beitShemeshId() {
  return BRANCH_BEIT_SHEMESH;
}
