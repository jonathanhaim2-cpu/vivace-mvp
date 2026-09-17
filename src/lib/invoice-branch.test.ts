import assert from "node:assert/strict";
import test from "node:test";
import {
  NETWORK_BRANCH_LABEL,
  NETWORK_BRANCH_SHORT_LABEL,
  NETWORK_BRANCH_VALUE,
  formatBranchesForPrompt,
  invoiceBranchDisplayName,
  invoiceBranchSelectValue,
  mapAiBranchHint,
  matchesInvoiceBranchFilter,
  parseInvoiceBranchFormValue,
  readAiBranchHintFromPayload,
  resolveInvoiceBranchChoice,
} from "./invoice-branch";

const branches = [
  { id: "branch_beit_shemesh", name: "סניף בית שמש", address: "נחל קטלב 2, בית שמש" },
  { id: "branch_kiryat_yearim", name: "סניף קרית יערים", address: "יצחק 27, קרית יערים" },
];

test("parseInvoiceBranchFormValue treats network sentinel as network, empty as unspecified", () => {
  assert.deepEqual(parseInvoiceBranchFormValue(NETWORK_BRANCH_VALUE), { kind: "network" });
  assert.deepEqual(parseInvoiceBranchFormValue("  "), { kind: "unspecified" });
  assert.deepEqual(parseInvoiceBranchFormValue(null), { kind: "unspecified" });
  assert.deepEqual(parseInvoiceBranchFormValue("branch_beit_shemesh"), {
    kind: "branch",
    branchId: "branch_beit_shemesh",
  });
});

test("explicit network stays null and does not fall back to an existing branch", () => {
  assert.deepEqual(
    resolveInvoiceBranchChoice({
      formValue: NETWORK_BRANCH_VALUE,
      existing: "branch_kiryat_yearim",
    }),
    { branchId: null, explicitNetwork: true },
  );
});

test("form branch id wins over existing", () => {
  assert.deepEqual(
    resolveInvoiceBranchChoice({
      formValue: "branch_beit_shemesh",
      existing: "branch_kiryat_yearim",
    }),
    { branchId: "branch_beit_shemesh", explicitNetwork: false },
  );
});

test("empty form keeps stored branch, otherwise null — no silent session assign", () => {
  assert.deepEqual(resolveInvoiceBranchChoice({ formValue: "", existing: "branch_kiryat_yearim" }), {
    branchId: "branch_kiryat_yearim",
    explicitNetwork: false,
  });
  assert.deepEqual(resolveInvoiceBranchChoice({ formValue: "" }), {
    branchId: null,
    explicitNetwork: false,
  });
});

test("classified null branch displays as רשת", () => {
  assert.equal(invoiceBranchDisplayName(null, null), NETWORK_BRANCH_SHORT_LABEL);
  assert.equal(invoiceBranchDisplayName("", null), NETWORK_BRANCH_SHORT_LABEL);
  assert.equal(invoiceBranchDisplayName("סניף בית שמש", "branch_beit_shemesh"), "סניף בית שמש");
  assert.equal(NETWORK_BRANCH_LABEL.includes("רשת"), true);
});

test("select value prefers AI network, then AI branch, then stored branch", () => {
  assert.equal(
    invoiceBranchSelectValue({ aiNetworkExpense: true, aiBranchId: "branch_beit_shemesh", branchId: "x" }),
    NETWORK_BRANCH_VALUE,
  );
  assert.equal(
    invoiceBranchSelectValue({ aiNetworkExpense: false, aiBranchId: "branch_kiryat_yearim", branchId: "x" }),
    "branch_kiryat_yearim",
  );
  assert.equal(invoiceBranchSelectValue({ branchId: "branch_beit_shemesh" }), "branch_beit_shemesh");
  assert.equal(invoiceBranchSelectValue({ fallback: "branch_kiryat_yearim" }), "branch_kiryat_yearim");
  assert.equal(invoiceBranchSelectValue({}), "");
});

test("filter רשת matches only null branchId", () => {
  assert.equal(matchesInvoiceBranchFilter(null, NETWORK_BRANCH_VALUE), true);
  assert.equal(matchesInvoiceBranchFilter("branch_beit_shemesh", NETWORK_BRANCH_VALUE), false);
  assert.equal(matchesInvoiceBranchFilter("branch_beit_shemesh", "branch_beit_shemesh"), true);
  assert.equal(matchesInvoiceBranchFilter(null, "branch_beit_shemesh"), false);
  assert.equal(matchesInvoiceBranchFilter(null, ""), true);
});

test("mapAiBranchHint maps city, address, id, and kuf-resh-yud spelling", () => {
  assert.deepEqual(mapAiBranchHint("בית שמש", branches), {
    branchId: "branch_beit_shemesh",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("סניף קרית יערים", branches), {
    branchId: "branch_kiryat_yearim",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("קריית יערים", branches), {
    branchId: "branch_kiryat_yearim",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("יצחק 27", branches), {
    branchId: "branch_kiryat_yearim",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("נחל קטלב 2", branches), {
    branchId: "branch_beit_shemesh",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("branch_beit_shemesh", branches), {
    branchId: "branch_beit_shemesh",
    network: false,
  });
  assert.deepEqual(mapAiBranchHint("Beit Shemesh", branches), {
    branchId: "branch_beit_shemesh",
    network: false,
  });
});

test("mapAiBranchHint suggests network for HQ/consulting with no site, and stays null when unclear", () => {
  assert.deepEqual(mapAiBranchHint("network", branches), { branchId: null, network: true });
  assert.deepEqual(mapAiBranchHint("רשת", branches), { branchId: null, network: true });
  assert.deepEqual(mapAiBranchHint("הוצאה רשתית", branches), { branchId: null, network: true });
  assert.deepEqual(mapAiBranchHint("ייעוץ מקצועי", branches), { branchId: null, network: true });
  assert.deepEqual(mapAiBranchHint("consulting HQ", branches), { branchId: null, network: true });
  assert.deepEqual(mapAiBranchHint("", branches), { branchId: null, network: false });
  assert.deepEqual(mapAiBranchHint("לא ברור", branches), { branchId: null, network: false });
  assert.deepEqual(mapAiBranchHint("תל אביב", branches), { branchId: null, network: false });
});

test("site evidence wins over a consulting/network keyword in the same hint", () => {
  assert.deepEqual(mapAiBranchHint("ייעוץ — בית שמש", branches), {
    branchId: "branch_beit_shemesh",
    network: false,
  });
});

test("ambiguous hint that matches both branches is left unset", () => {
  assert.deepEqual(mapAiBranchHint("בית שמש וקרית יערים", branches), {
    branchId: null,
    network: false,
  });
});

test("readAiBranchHintFromPayload accepts branchHint, branchId, or branchName", () => {
  assert.equal(readAiBranchHintFromPayload({ branchHint: "network" }), "network");
  assert.equal(readAiBranchHintFromPayload({ branchId: "branch_beit_shemesh" }), "branch_beit_shemesh");
  assert.equal(readAiBranchHintFromPayload({ branchName: "קרית יערים" }), "קרית יערים");
  assert.equal(readAiBranchHintFromPayload({ branchHint: "" }), null);
});

test("prompt lists known branches for the model", () => {
  const prompt = formatBranchesForPrompt(branches);
  assert.match(prompt, /branch_beit_shemesh/);
  assert.match(prompt, /בית שמש/);
  assert.match(prompt, /קרית יערים/);
  assert.match(prompt, /נחל קטלב/);
});
