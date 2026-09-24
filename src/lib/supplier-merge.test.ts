import assert from "node:assert/strict";
import test from "node:test";
import { pushAppSchema } from "./test-db";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  isSemoryAliasName,
  isSemoryDuplicateSupplier,
  mergeSemoryDuplicates,
  normalizeSupplierName,
  SEMORY_CANONICAL_ID,
  SEMORY_CANONICAL_NAME,
  SEMORY_TAX_ID,
} from "./supplier-merge";

test("Semory aliases collapse spelling and Ltd suffixes", () => {
  assert.equal(isSemoryAliasName("סמורי"), true);
  assert.equal(isSemoryAliasName('סמורי בע"מ'), true);
  assert.equal(isSemoryAliasName("סמורי בע״מ"), true);
  assert.equal(isSemoryAliasName("Semory"), true);
  assert.equal(isSemoryAliasName("Semory Ltd"), true);
  assert.equal(isSemoryAliasName("י.שבי שיווק מזון בע״מ"), false);
  assert.equal(isSemoryAliasName("מ.א ייצור ויבוא ממחטות בע\"מ"), false);
  assert.equal(normalizeSupplierName('סמורי בע"מ'), "סמורי בעמ");
});

test("duplicate detection prefers known id, name aliases, and Semory ח.פ.", () => {
  assert.equal(isSemoryDuplicateSupplier({ id: SEMORY_CANONICAL_ID, name: "סמורי בע״מ", taxId: SEMORY_TAX_ID }), false);
  assert.equal(isSemoryDuplicateSupplier({ id: "sup_shiny", name: "מ.א ייצור", taxId: null }), true);
  assert.equal(isSemoryDuplicateSupplier({ id: "cuid_from_invoice", name: "סמורי", taxId: null }), true);
  assert.equal(isSemoryDuplicateSupplier({ id: "cuid_from_invoice", name: "Other Ltd", taxId: SEMORY_TAX_ID }), true);
  assert.equal(isSemoryDuplicateSupplier({ id: "sup_cohen", name: "אחים כהן", taxId: "512404104" }), false);
});

test("catalog keeps one Semory including the former Shiny product", () => {
  const file = path.join(process.cwd(), "prisma", "real-catalog.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    suppliers: { id: string; name: string; products: { name: string }[] }[];
  };
  const matches = data.suppliers.filter(
    (supplier) => supplier.id === "sup_shiny" || isSemoryAliasName(supplier.name),
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, SEMORY_CANONICAL_ID);
  assert.equal(matches[0]?.name, SEMORY_CANONICAL_NAME);
  assert.ok(matches[0]?.products.some((product) => product.name.includes("שייני")));
  assert.ok(matches[0]?.products.some((product) => product.name.includes("סלייסים")));
});

test("merge reattaches products and orders then deletes the duplicate", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "semory-merge-"));
  const dbPath = path.join(dir, "test.db");
  const url = `file:${dbPath}`;
  try {
    pushAppSchema(url);
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      await client.branch.create({ data: { id: "branch_a", name: "A" } });
      await client.branch.create({ data: { id: "branch_b", name: "B" } });

      await client.supplier.create({
        data: {
          id: "sup_cohen",
          name: "אחים כהן",
          whatsappPhone: "0525804979",
          documentType: "TAX_INVOICE",
          deliveryDays: "[0]",
          orderCutoffTime: "14:00",
          taxId: "512404104",
        },
      });
      const cohenProduct = await client.product.create({
        data: {
          supplierId: "sup_cohen",
          name: "מוצרלה",
          stockStandard: 4,
          agreedPrice: 50,
        },
      });
      const cohenOrder = await client.order.create({
        data: {
          supplierId: "sup_cohen",
          branchId: "branch_a",
          status: "CONFIRMED",
          lines: { create: { productId: cohenProduct.id, qty: 1, unitPrice: 50 } },
        },
      });

      await client.supplier.create({
        data: {
          id: SEMORY_CANONICAL_ID,
          name: "סמורי בע״מ",
          whatsappPhone: "0502925050",
          documentType: "TAX_INVOICE",
          deliveryDays: "[]",
          orderCutoffTime: "14:00",
          taxId: SEMORY_TAX_ID,
        },
      });
      const keepProduct = await client.product.create({
        data: {
          supplierId: SEMORY_CANONICAL_ID,
          name: "סלייסים לפיצה פסי קרטון",
          stockStandard: 1,
          agreedPrice: 10,
        },
      });

      await client.supplier.create({
        data: {
          id: "sup_shiny",
          name: "סמורי",
          whatsappPhone: "0502925050",
          documentType: "TAX_INVOICE",
          deliveryDays: "[]",
          orderCutoffTime: "14:00",
          taxId: SEMORY_TAX_ID,
        },
      });
      const shinyProduct = await client.product.create({
        data: {
          supplierId: "sup_shiny",
          name: 'מבשם אוויר שייני וניל 250 מ"ל',
          stockStandard: 1,
          agreedPrice: 20,
        },
      });
      await client.supplierBranch.create({ data: { supplierId: "sup_shiny", branchId: "branch_a" } });
      await client.supplierBranch.create({ data: { supplierId: SEMORY_CANONICAL_ID, branchId: "branch_a" } });
      await client.supplierBranch.create({ data: { supplierId: "sup_shiny", branchId: "branch_b" } });

      const invoiceDup = await client.supplier.create({
        data: {
          name: 'סמורי בע"מ',
          whatsappPhone: "0500000000",
          documentType: "TAX_INVOICE",
          deliveryDays: "[]",
          orderCutoffTime: "14:00",
        },
      });
      await client.product.create({
        data: {
          supplierId: invoiceDup.id,
          name: "סלייסים לפיצה פסי קרטון",
          stockStandard: 2,
          agreedPrice: 12,
        },
      });

      const openOrder = await client.order.create({
        data: {
          supplierId: "sup_shiny",
          branchId: "branch_a",
          status: "CONFIRMED",
          lines: {
            create: { productId: shinyProduct.id, qty: 3, unitPrice: 20 },
          },
        },
      });

      const result = await mergeSemoryDuplicates(client);
      assert.ok(result.mergedIds.includes("sup_shiny"));
      assert.ok(result.mergedIds.includes(invoiceDup.id));

      const remaining = await client.supplier.findMany({
        where: {
          OR: [{ id: { in: ["sup_shiny", invoiceDup.id, SEMORY_CANONICAL_ID] } }, { name: { contains: "סמורי" } }],
        },
      });
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0]?.id, SEMORY_CANONICAL_ID);
      assert.equal(remaining[0]?.name, SEMORY_CANONICAL_NAME);
      assert.equal(remaining[0]?.active, true);

      const products = await client.product.findMany({ where: { supplierId: SEMORY_CANONICAL_ID }, orderBy: { name: "asc" } });
      assert.equal(products.length, 2);
      assert.ok(products.some((product) => product.id === keepProduct.id));
      assert.ok(products.some((product) => product.name.includes("שייני")));

      const movedOrder = await client.order.findUnique({ where: { id: openOrder.id } });
      assert.equal(movedOrder?.supplierId, SEMORY_CANONICAL_ID);

      const links = await client.supplierBranch.findMany({ where: { supplierId: SEMORY_CANONICAL_ID } });
      assert.equal(links.length, 2);

      const cohen = await client.supplier.findUnique({ where: { id: "sup_cohen" } });
      assert.equal(cohen?.name, "אחים כהן");
      const untouchedOrder = await client.order.findUnique({ where: { id: cohenOrder.id } });
      assert.equal(untouchedOrder?.supplierId, "sup_cohen");
      assert.equal(untouchedOrder?.status, "CONFIRMED");
      assert.equal(await client.product.count({ where: { id: cohenProduct.id } }), 1);
    } finally {
      await client.$disconnect();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
