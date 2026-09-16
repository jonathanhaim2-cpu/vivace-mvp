import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROI_WHATSAPP_PHONE } from "./constants";
import {
  FILE_LABEL_SUPPLIER_NAMES,
  looksLikeFileLabelName,
  REAL_SUPPLIER_DETAILS,
} from "./supplier-details";
import { isSemoryAliasName, SEMORY_CANONICAL_ID, SEMORY_CANONICAL_NAME } from "./supplier-merge";
import { isSendToSuppliersValue, resolveOrderWhatsAppPhone } from "./whatsapp-routing";
import { toWhatsAppPhone } from "./whatsapp";

test("send-to-suppliers setting defaults off and parses true/false", () => {
  assert.equal(isSendToSuppliersValue(undefined), false);
  assert.equal(isSendToSuppliersValue("false"), false);
  assert.equal(isSendToSuppliersValue("true"), true);
  assert.equal(isSendToSuppliersValue("1"), true);
});

test("OFF routes WhatsApp to Roi even when supplier phones exist", () => {
  assert.equal(
    resolveOrderWhatsAppPhone({
      sendToSuppliers: false,
      supplierPhone: "0525804979",
      branchPhone: "0505858939",
    }),
    ROI_WHATSAPP_PHONE,
  );
});

test("ON uses branch override then supplier catalog phone", () => {
  assert.equal(
    resolveOrderWhatsAppPhone({
      sendToSuppliers: true,
      supplierPhone: "0536701680",
      branchPhone: "0505858939",
    }),
    "0505858939",
  );
  assert.equal(
    resolveOrderWhatsAppPhone({
      sendToSuppliers: true,
      supplierPhone: "0525804979",
      branchPhone: null,
    }),
    "0525804979",
  );
});

test("ON with missing catalog phone still falls back to Roi", () => {
  assert.equal(
    resolveOrderWhatsAppPhone({ sendToSuppliers: true, supplierPhone: "  ", branchPhone: "" }),
    ROI_WHATSAPP_PHONE,
  );
});

test("Coca-Cola landline normalizes to international wa.me digits", () => {
  assert.equal(toWhatsAppPhone("09-7629046"), "97297629046");
});

test("real overlay names are commercial names, not Zest file labels", () => {
  for (const [id, overlay] of Object.entries(REAL_SUPPLIER_DETAILS)) {
    assert.equal(looksLikeFileLabelName(overlay.name), false, `${id} still looks like a file label`);
    for (const label of FILE_LABEL_SUPPLIER_NAMES) {
      assert.notEqual(overlay.name, label);
    }
  }
  assert.equal(REAL_SUPPLIER_DETAILS.sup_softdrinks.name, "החברה המרכזית קוקה קולה");
  assert.equal(REAL_SUPPLIER_DETAILS.sup_icecream.branchOverrides?.branch_beit_shemesh?.whatsappPhone, "0505858939");
  assert.equal(REAL_SUPPLIER_DETAILS.sup_icecream.branchOverrides?.branch_kiryat_yearim?.whatsappPhone, "0536701680");
  assert.equal(REAL_SUPPLIER_DETAILS.sup_produce.plantsCouncilRelevant, true);
});

test("catalog JSON uses real names and keeps stable supplier ids", () => {
  const file = path.join(process.cwd(), "prisma", "real-catalog.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    whatsappPhone?: string;
    suppliers: { id: string; name: string }[];
  };
  assert.equal(data.whatsappPhone, undefined);
  assert.equal(data.suppliers.length, 16);
  const semory = data.suppliers.filter(
    (supplier) => supplier.id === SEMORY_CANONICAL_ID || supplier.id === "sup_shiny" || isSemoryAliasName(supplier.name),
  );
  assert.equal(semory.length, 1);
  assert.equal(semory[0]?.id, SEMORY_CANONICAL_ID);
  assert.equal(semory[0]?.name, SEMORY_CANONICAL_NAME);
  assert.equal(REAL_SUPPLIER_DETAILS.sup_shiny, undefined);
  for (const supplier of data.suppliers) {
    assert.equal(looksLikeFileLabelName(supplier.name), false, supplier.name);
    const overlay = REAL_SUPPLIER_DETAILS[supplier.id];
    assert.ok(overlay, `missing overlay for ${supplier.id}`);
    assert.equal(supplier.name, overlay.name);
  }
});
