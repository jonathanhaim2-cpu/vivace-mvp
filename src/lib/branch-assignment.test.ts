import assert from "node:assert/strict";
import test from "node:test";
import {
  branchConflict,
  chooseIngestBranch,
  deliveryPointIndex,
  resolveOrderBranchId,
  selectSessionBranch,
} from "./branch-assignment";

const branches = [
  { id: "branch_beit_shemesh", name: "סניף בית שמש", address: "נחל קטלב 2, בית שמש" },
  { id: "branch_kiryat_yearim", name: "סניף קרית יערים", address: "יצחק 27, קרית יערים" },
];

test("delivery points that differ by branch stay unique; the shared Coca-Cola code does not pick a branch", () => {
  const points = deliveryPointIndex();
  assert.equal(points.unique.find((row) => row.code === "36114")?.branchId, "branch_kiryat_yearim");
  assert.equal(points.unique.find((row) => row.code === "36112")?.branchId, "branch_beit_shemesh");
  assert.equal(points.unique.find((row) => row.code === "273113")?.branchId, "branch_kiryat_yearim");
  assert.equal(points.unique.find((row) => row.code === "274084")?.branchId, "branch_beit_shemesh");
  assert.equal(points.ambiguous.includes("884265"), true);
  assert.equal(points.unique.some((row) => row.code === "884265"), false);
});

test("ship-to קרית יערים wins over a בית שמש letterhead", () => {
  const choice = chooseIngestBranch({
    documentText: "עוסק מורשה ויואצ'ה בית שמש ח.פ 204754121\nיעד משלוח: קרית יערים, יצחק 27",
    branches,
  });
  assert.equal(choice.branchId, "branch_kiryat_yearim");
  assert.equal(choice.source, "ship-to");
});

test("unique delivery point 36114 assigns Kiryat even if the AI hint says Beit Shemesh", () => {
  const choice = chooseIngestBranch({
    documentText: "חשבונית בית שמש\nנקודת מכירה 36114",
    branches,
    aiHint: "בית שמש",
  });
  assert.equal(choice.branchId, "branch_kiryat_yearim");
  assert.equal(choice.source, "delivery-point");
});

test("a Kiryat filename beats an AI guess of the first branch", () => {
  const choice = chooseIngestBranch({
    documentText: "vivac'e קרית יערים.pdf",
    branches,
    aiHint: "בית שמש",
  });
  assert.equal(choice.branchId, "branch_kiryat_yearim");
  assert.notEqual(choice.source, "ai");
});

test("shared delivery point and empty text do not default to Beit Shemesh", () => {
  assert.deepEqual(chooseIngestBranch({ documentText: "נקודה 884265", branches, aiHint: "" }), {
    branchId: null,
    network: false,
    source: "none",
  });
  assert.equal(chooseIngestBranch({ documentText: "", branches, aiHint: null }).branchId, null);
  assert.equal(chooseIngestBranch({ documentText: "תל אביב", branches }).branchId, null);
});

test("Kiryat-only supplier name assigns קרית יערים", () => {
  const choice = chooseIngestBranch({
    documentText: "גלילה תוצרת חקלאית בע״מ חשבונית",
    branches,
    aiHint: "בית שמש",
  });
  assert.equal(choice.branchId, "branch_kiryat_yearim");
  assert.equal(choice.source, "supplier");
});

test("unset network cookie is משרד רשת, not the alphabetically first branch", () => {
  assert.equal(
    selectSessionBranch({
      isNetwork: true,
      requested: null,
      branches: [{ id: "branch_beit_shemesh" }, { id: "branch_kiryat_yearim" }],
    }),
    null,
  );
  assert.equal(
    selectSessionBranch({
      isNetwork: true,
      requested: "network",
      branches: [{ id: "branch_beit_shemesh" }, { id: "branch_kiryat_yearim" }],
    }),
    null,
  );
  assert.equal(
    selectSessionBranch({
      isNetwork: true,
      requested: "branch_kiryat_yearim",
      branches: [{ id: "branch_beit_shemesh" }, { id: "branch_kiryat_yearim" }],
    }),
    "branch_kiryat_yearim",
  );
  assert.equal(
    selectSessionBranch({
      isNetwork: false,
      requested: null,
      branches: [{ id: "branch_beit_shemesh" }, { id: "branch_kiryat_yearim" }],
    }),
    "branch_beit_shemesh",
  );
});

test("duplicating an order keeps the source branch instead of the session branch", () => {
  assert.equal(
    resolveOrderBranchId({
      sourceOrderBranchId: "branch_kiryat_yearim",
      sessionBranchId: "branch_beit_shemesh",
    }),
    "branch_kiryat_yearim",
  );
  assert.equal(
    resolveOrderBranchId({ explicitBranchId: "", sessionBranchId: null }),
    null,
  );
  assert.equal(
    resolveOrderBranchId({ explicitBranchId: "branch_kiryat_yearim", sessionBranchId: "branch_beit_shemesh" }),
    "branch_kiryat_yearim",
  );
});

test("stored Beit Shemesh row conflicts with Kiryat evidence", () => {
  const choice = chooseIngestBranch({
    documentText: "יעד משלוח: קרית יערים",
    branches,
  });
  assert.equal(branchConflict("branch_beit_shemesh", choice), true);
  assert.equal(branchConflict("branch_kiryat_yearim", choice), false);
});
