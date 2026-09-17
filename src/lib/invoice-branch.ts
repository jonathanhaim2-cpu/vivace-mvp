/** Sentinel submitted by BranchSelect when the user picks network overhead (not a Branch row). */
export const NETWORK_BRANCH_VALUE = "network";
export const NETWORK_BRANCH_LABEL = "רשת / הוצאה רשתית";
export const NETWORK_BRANCH_SHORT_LABEL = "רשת";

export type KnownBranch = {
  id: string;
  name: string;
  address?: string | null;
};

export type InvoiceBranchFormKind = "branch" | "network" | "unspecified";

export type InvoiceBranchFormChoice =
  | { kind: "branch"; branchId: string }
  | { kind: "network" }
  | { kind: "unspecified" };

export type ResolvedInvoiceBranch = {
  branchId: string | null;
  /** True when the form explicitly chose רשת — do not fall back to session/existing. */
  explicitNetwork: boolean;
};

const NETWORK_HINTS = [
  "network",
  "רשת",
  "הוצאה רשתית",
  "הוצאות רשתיות",
  "hq",
  "headquarters",
  "מטה",
  "משרד ראשי",
  "ייעוץ",
  "ייעוץ מקצועי",
  "consulting",
  "consultant",
  "הנהלה",
];

export function parseInvoiceBranchFormValue(raw: string | null | undefined): InvoiceBranchFormChoice {
  if (raw == null) return { kind: "unspecified" };
  const value = String(raw).trim();
  if (!value) return { kind: "unspecified" };
  if (value === NETWORK_BRANCH_VALUE) return { kind: "network" };
  return { kind: "branch", branchId: value };
}

/**
 * Form wins. Explicit «רשת» stays null (no session fallback).
 * Empty form keeps an already-stored branch, otherwise null.
 */
export function resolveInvoiceBranchChoice(input: {
  formValue: string | null | undefined;
  existing?: string | null;
}): ResolvedInvoiceBranch {
  const parsed = parseInvoiceBranchFormValue(input.formValue);
  if (parsed.kind === "network") return { branchId: null, explicitNetwork: true };
  if (parsed.kind === "branch") return { branchId: parsed.branchId, explicitNetwork: false };
  const existing = input.existing?.trim() || null;
  return { branchId: existing, explicitNetwork: false };
}

export function invoiceBranchDisplayName(
  branchName: string | null | undefined,
  branchId?: string | null,
) {
  const name = branchName?.trim() || "";
  if (branchId || name) return name || NETWORK_BRANCH_SHORT_LABEL;
  return NETWORK_BRANCH_SHORT_LABEL;
}

export function invoiceBranchSelectValue(input: {
  aiBranchId?: string | null;
  aiNetworkExpense?: boolean | null;
  branchId?: string | null;
  fallback?: string | null;
}) {
  if (input.aiNetworkExpense) return NETWORK_BRANCH_VALUE;
  if (input.aiBranchId) return input.aiBranchId;
  if (input.branchId) return input.branchId;
  return input.fallback ?? "";
}

export function matchesInvoiceBranchFilter(photoBranchId: string | null | undefined, filter: string) {
  if (!filter) return true;
  if (filter === NETWORK_BRANCH_VALUE) return !photoBranchId;
  return photoBranchId === filter;
}

export function formatBranchesForPrompt(branches: KnownBranch[]) {
  if (branches.length === 0) return "(אין סניפים ברשימה)";
  return branches
    .map((branch) => {
      const address = branch.address?.trim();
      return `- ${branch.id} | ${branch.name}${address ? ` | ${address}` : ""}`;
    })
    .join("\n");
}

export function readAiBranchHintFromPayload(parsed: Record<string, unknown>) {
  for (const key of ["branchHint", "branchId", "branchName"] as const) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function mapAiBranchHint(
  hint: string | null | undefined,
  branches: KnownBranch[],
): { branchId: string | null; network: boolean } {
  const raw = hint?.trim() ?? "";
  if (!raw) return { branchId: null, network: false };

  const foldedHint = foldBranchText(raw);
  if (!foldedHint) return { branchId: null, network: false };

  const byId = branches.find((branch) => branch.id === raw || foldBranchText(branch.id) === foldedHint);
  if (byId) return { branchId: byId.id, network: false };

  const matches = branches.filter((branch) => branchMatchesHint(branch, foldedHint));
  if (matches.length === 1) return { branchId: matches[0].id, network: false };
  if (matches.length > 1) return { branchId: null, network: false };

  if (isNetworkBranchHint(foldedHint)) return { branchId: null, network: true };
  return { branchId: null, network: false };
}

export function isNetworkBranchHint(hint: string) {
  const folded = foldBranchText(hint);
  if (!folded) return false;
  if (folded === NETWORK_BRANCH_VALUE) return true;
  return NETWORK_HINTS.some((item) => {
    const needle = foldBranchText(item);
    return folded === needle || folded.includes(needle);
  });
}

function branchMatchesHint(branch: KnownBranch, foldedHint: string) {
  const haystack = [
    branch.id,
    branch.name,
    branch.address ?? "",
    branch.name.replace(/^סניף\s+/, ""),
    ...latinAliasesForBranch(branch),
  ]
    .map((part) => foldBranchText(part))
    .filter(Boolean);

  return haystack.some((part) => {
    if (!part) return false;
    if (foldedHint === part) return true;
    if (foldedHint.includes(part) || part.includes(foldedHint)) return true;
    const tokens = part.split(" ").filter((token) => token.length >= 3);
    return tokens.length > 0 && tokens.every((token) => foldedHint.includes(token));
  });
}

function latinAliasesForBranch(branch: KnownBranch) {
  const folded = foldBranchText(`${branch.name} ${branch.address ?? ""}`);
  const aliases: string[] = [];
  if (folded.includes("בית שמש")) aliases.push("beit shemesh", "bet shemesh", "beitshemesh");
  if (folded.includes("קרית יערים")) aliases.push("kiryat yearim", "kiryat yaarim", "kiryat yearim");
  return aliases;
}

function foldBranchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/קריית/g, "קרית")
    .replace(/yaarim|ye'arim|ye’arim/g, "yearim")
    .replace(/['׳`״"”]/g, "")
    .replace(/[־–—_-]/g, " ")
    .replace(/^סניף\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}
