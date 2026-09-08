import { unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedChartOfAccounts } from "../src/lib/accounts";
import { seedProductCategories } from "../src/lib/categories";
import { DEMO_IDS, seedDemo } from "./seed-demo";
import { seedRealCatalog } from "./seed-real";

const prisma = new PrismaClient();

function demoEnabled() {
  const raw = process.env.SEED_DEMO?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function realEnabled() {
  const raw = process.env.SEED_REAL?.trim().toLowerCase();
  // default ON for production real-data testing unless explicitly disabled
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}

async function seedMinimalSettings() {
  await prisma.appSetting.upsert({
    where: { key: "standardFoodCostPercent" },
    update: {},
    create: { key: "standardFoodCostPercent", value: "28" },
  });
  const forecast = await prisma.appSetting.findUnique({
    where: { key: "dashboard.forecastTurnoverIls" },
  });
  if (!forecast) {
    await prisma.appSetting.create({
      data: { key: "dashboard.forecastTurnoverIls", value: "0" },
    });
  }
  await prisma.appSetting.upsert({
    where: { key: "dashboard.rogueDeviationPercent" },
    update: {},
    create: { key: "dashboard.rogueDeviationPercent", value: "2" },
  });
}

/** Removes the old seeded catalog so Railway boots empty for real-data tests. */
async function wipeKnownDemo() {
  const { branches, suppliers, products, orders, receipts, photos, dishes, inventory, recurring, files } =
    DEMO_IDS;

  await prisma.invoicePhoto.deleteMany({
    where: {
      OR: [
        { id: { in: [...photos] } },
        { goodsReceiptId: { in: [...receipts] } },
        { fileName: { in: [...files] } },
        { goodsReceipt: { order: { branchId: { in: [...branches] } } } },
        { goodsReceipt: { order: { supplierId: { in: [...suppliers] } } } },
      ],
    },
  });
  await prisma.goodsReceipt.deleteMany({
    where: {
      OR: [
        { id: { in: [...receipts] } },
        { orderId: { in: [...orders] } },
        { order: { branchId: { in: [...branches] } } },
        { order: { supplierId: { in: [...suppliers] } } },
      ],
    },
  });
  await prisma.order.deleteMany({
    where: {
      OR: [{ id: { in: [...orders] } }, { supplierId: { in: [...suppliers] } }, { branchId: { in: [...branches] } }],
    },
  });
  await prisma.inventoryCount.deleteMany({
    where: {
      OR: [{ id: { in: [...inventory] } }, { branchId: { in: [...branches] } }],
    },
  });
  await prisma.wasteEntry.deleteMany({
    where: {
      OR: [{ branchId: { in: [...branches] } }, { productId: { in: [...products] } }],
    },
  });
  await prisma.dishComponent.deleteMany({
    where: {
      OR: [
        { dishId: { in: [...dishes] } },
        { componentDishId: { in: [...dishes] } },
        { productId: { in: [...products] } },
      ],
    },
  });
  await prisma.dish.deleteMany({ where: { id: { in: [...dishes] } } });
  await prisma.recurringLine.deleteMany({ where: { id: { in: [...recurring] } } });
  await prisma.product.deleteMany({
    where: {
      OR: [{ id: { in: [...products] } }, { supplierId: { in: [...suppliers] } }],
    },
  });
  await prisma.supplier.deleteMany({ where: { id: { in: [...suppliers] } } });
  await prisma.branch.deleteMany({ where: { id: { in: [...branches] } } });

  const forecast = await prisma.appSetting.findUnique({
    where: { key: "dashboard.forecastTurnoverIls" },
  });
  if (forecast?.value === "200000") {
    await prisma.appSetting.update({
      where: { key: "dashboard.forecastTurnoverIls" },
      data: { value: "0" },
    });
  }

  const uploadDir = process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
  for (const fileName of files) {
    await unlink(path.join(uploadDir, fileName)).catch(() => undefined);
  }
}

async function main() {
  await seedChartOfAccounts();
  await seedProductCategories();
  await seedMinimalSettings();

  if (demoEnabled()) {
    await seedDemo(prisma);
    return;
  }

  await wipeKnownDemo();
  if (realEnabled()) {
    await seedRealCatalog(prisma);
    console.log("Vivac'e real catalog seeded (suppliers + products from Zest exports).");
    return;
  }
  console.log("Vivac'e structural seed ready (chart + categories + settings). Demo catalog skipped.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
