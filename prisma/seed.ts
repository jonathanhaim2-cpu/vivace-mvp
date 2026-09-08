import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { CHART_OF_ACCOUNTS } from "../src/lib/chart-of-accounts";
import { seedProductCategories } from "../src/lib/categories";
import { PRODUCT_CATEGORY_ASSIGNMENTS, SUPPLIER_DEFAULT_CATEGORIES } from "../src/lib/product-categories";
import { ensurePriceLists, syncProductPriceLists } from "../src/lib/catalog";

const prisma = new PrismaClient();

async function seedChart() {
  for (const [parentIndex, parent] of CHART_OF_ACCOUNTS.entries()) {
    await prisma.account.upsert({
      where: { id: parent.id },
      update: {
        name: parent.name,
        kind: parent.kind,
        parentId: null,
        sortOrder: parentIndex * 100,
      },
      create: {
        id: parent.id,
        name: parent.name,
        kind: parent.kind,
        parentId: null,
        sortOrder: parentIndex * 100,
      },
    });
    for (const [childIndex, child] of parent.children.entries()) {
      await prisma.account.upsert({
        where: { id: child.id },
        update: {
          name: child.name,
          kind: parent.kind,
          parentId: parent.id,
          sortOrder: parentIndex * 100 + childIndex + 1,
        },
        create: {
          id: child.id,
          name: child.name,
          kind: parent.kind,
          parentId: parent.id,
          sortOrder: parentIndex * 100 + childIndex + 1,
        },
      });
    }
  }
}

const DEMO_INVOICE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <rect width="720" height="960" fill="#fbf7ef"/>
  <rect x="32" y="32" width="656" height="896" fill="#fff" stroke="#2f4a38" stroke-width="2"/>
  <text x="360" y="90" text-anchor="middle" font-size="28" fill="#2f4a38" font-family="Arial, sans-serif">חשבונית מס / תעודת משלוח</text>
  <text x="360" y="130" text-anchor="middle" font-size="18" fill="#5c6b57" font-family="Arial, sans-serif">Vivac'e · ויואצ'ה · 204754121</text>
  <text x="80" y="200" font-size="16" fill="#333" font-family="Arial, sans-serif">ספק: תנובה</text>
  <text x="80" y="230" font-size="16" fill="#333" font-family="Arial, sans-serif">סניף: הרצליה</text>
  <text x="80" y="260" font-size="16" fill="#333" font-family="Arial, sans-serif">מסמך לדוגמה ל-MVP</text>
  <rect x="80" y="300" width="560" height="1" fill="#d9cbb3"/>
  <text x="80" y="350" font-size="16" fill="#333" font-family="Arial, sans-serif">חלב 3% 1 ליטר × 24</text>
  <text x="80" y="385" font-size="16" fill="#333" font-family="Arial, sans-serif">גבינה צהובה 400ג × 8  (מחיר עודכן)</text>
  <text x="80" y="420" font-size="16" fill="#333" font-family="Arial, sans-serif">שמנת לבישול 15% × 12</text>
  <text x="80" y="520" font-size="18" fill="#2f4a38" font-family="Arial, sans-serif">קובץ זה נוצר אוטומטית לצורך הדגמה</text>
</svg>`;

async function main() {
  await seedChart();
  await seedProductCategories();

  const ids = {
    herzliya: "branch_herzliya",
    telaviv: "branch_telaviv",
    tnuva: "sup_tnuva",
    strauss: "sup_strauss",
    vegetables: "sup_sharon_veg",
    warehouse: "sup_shuk",
    orderOpen: "ord_open_veg",
    orderPending: "ord_pending_tnuva",
    receiptPending: "rcpt_pending_tnuva",
    photoPending: "photo_pending_tnuva",
  };

  await prisma.branch.upsert({
    where: { id: ids.herzliya },
    update: { name: "סניף הרצליה", address: "המנור 12, הרצליה פיתוח" },
    create: { id: ids.herzliya, name: "סניף הרצליה", address: "המנור 12, הרצליה פיתוח" },
  });
  await prisma.branch.upsert({
    where: { id: ids.telaviv },
    update: { name: "סניף תל אביב", address: "אלנבי 88, תל אביב" },
    create: { id: ids.telaviv, name: "סניף תל אביב", address: "אלנבי 88, תל אביב" },
  });

  await prisma.supplier.upsert({
    where: { id: ids.tnuva },
    update: {},
    create: {
      id: ids.tnuva,
      name: "תנובה",
      taxId: "520004078",
      agentName: "דנה לוי",
      agentPhone: "03-6402222",
      whatsappPhone: "0501234567",
      driverName: "יוסי",
      documentType: "TAX_INVOICE",
      deliveryDays: JSON.stringify([0, 2, 4]),
      orderCutoffTime: "11:00",
      reminderHoursBefore: 2,
      weeklyBudgetIls: 4200,
      notes: "חלב וגבינות. להשאיר במקרר האחורי.",
    },
  });

  await prisma.supplier.upsert({
    where: { id: ids.strauss },
    update: {},
    create: {
      id: ids.strauss,
      name: "שטראוס פודסרביס",
      taxId: "520035405",
      agentName: "איתי כהן",
      agentPhone: "04-8401111",
      whatsappPhone: "0529876543",
      driverName: "מאיר",
      documentType: "TAX_INVOICE",
      deliveryDays: JSON.stringify([0, 3]),
      orderCutoffTime: "14:00",
      reminderHoursBefore: 3,
      weeklyBudgetIls: 2800,
      notes: "יבש וממרחים. הזמנה בימי ראשון ורביעי.",
    },
  });

  await prisma.supplier.upsert({
    where: { id: ids.vegetables },
    update: {},
    create: {
      id: ids.vegetables,
      name: "ירקות השרון",
      taxId: "514887221",
      agentName: "רמי אזולאי",
      agentPhone: "09-9551212",
      whatsappPhone: "0541112233",
      driverName: "אבי",
      documentType: "DELIVERY_NOTE",
      deliveryDays: JSON.stringify([0, 1, 2, 3, 4, 5]),
      orderCutoffTime: "16:00",
      reminderHoursBefore: 1,
      weeklyBudgetIls: 3500,
      notes: "תוצרת טרייה. תעודת משלוח, חשבונית בסוף השבוע.",
    },
  });

  await prisma.supplier.upsert({
    where: { id: ids.warehouse },
    update: {},
    create: {
      id: ids.warehouse,
      name: "מחסני השוק",
      taxId: "511223344",
      agentName: "שירן גבאי",
      agentPhone: "08-6667788",
      whatsappPhone: "0534445566",
      driverName: "חיים",
      documentType: "MIX_PER_PRODUCT",
      deliveryDays: JSON.stringify([1, 4]),
      orderCutoffTime: "12:30",
      reminderHoursBefore: 4,
      weeklyBudgetIls: 5000,
      notes: "מזווה יבש. חלק מהפריטים בחשבונית מס וחלק בתעודת משלוח.",
    },
  });

  for (const [supplierId, categoryId] of Object.entries(SUPPLIER_DEFAULT_CATEGORIES)) {
    await prisma.supplier.update({ where: { id: supplierId }, data: { defaultCategoryId: categoryId } });
  }

  await prisma.supplier.update({
    where: { id: ids.tnuva },
    data: {
      paymentTerms: "NET30",
      paymentMethod: "TRANSFER",
      accountingPhone: "03-6402200",
      accountingEmail: "ap@tnuva.example",
      partnerName: null,
      partnerPercent: null,
    },
  });
  await prisma.supplier.update({
    where: { id: ids.strauss },
    data: {
      paymentTerms: "NET45",
      paymentMethod: "TRANSFER",
      accountingPhone: "04-8401000",
      accountingEmail: "ap@strauss.example",
    },
  });
  await prisma.supplier.update({
    where: { id: ids.vegetables },
    data: {
      paymentTerms: "IMMEDIATE",
      paymentMethod: "TRANSFER",
      accountingPhone: "09-9551212",
      accountingEmail: "office@sharon-veg.example",
      plantsCouncilUrl: "https://www.plants.org.il/",
      plantsCouncilDiscountPct: 10,
    },
  });
  await prisma.supplier.update({
    where: { id: ids.warehouse },
    data: {
      paymentTerms: "NET30",
      paymentMethod: "CARD",
      accountingPhone: "08-6667788",
      accountingEmail: "ap@shuk.example",
    },
  });

  const allBranches = [ids.herzliya, ids.telaviv];
  const allSuppliers = [ids.tnuva, ids.strauss, ids.vegetables, ids.warehouse];
  for (const supplierId of allSuppliers) {
    for (const branchId of allBranches) {
      await prisma.supplierBranch.upsert({
        where: { supplierId_branchId: { supplierId, branchId } },
        update: {},
        create: { supplierId, branchId },
      });
    }
  }

  const products = [
    {
      id: "prd_milk",
      supplierId: ids.tnuva,
      name: "חלב 3% 1 ליטר",
      sku: "TNV-MILK-3",
      notes: "לשמור בקירור",
      stockStandard: 24,
      agreedPrice: 6.9,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 12,
      packagingNotes: "קרטון = 12 קרטוניות 1 ליטר",
    },
    {
      id: "prd_cheese",
      supplierId: ids.tnuva,
      name: "גבינה צהובה פרוסה 400ג",
      sku: "TNV-CHED-400",
      notes: "",
      stockStandard: 8,
      agreedPrice: 18.5,
      discountPercent: 5,
      vatIncluded: true,
      cartonToBags: 4,
      bagsToUnits: 6,
      packagingNotes: "קרטון → 4 מגשים → 6 יח׳ במגש",
    },
    {
      id: "prd_cream",
      supplierId: ids.tnuva,
      name: "שמנת לבישול 15% 250מ״ל",
      sku: "TNV-CRM-15",
      notes: "",
      stockStandard: 12,
      agreedPrice: 8.2,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 2,
      bagsToUnits: 6,
      packagingNotes: "קרטון = 12 יח׳",
    },
    {
      id: "prd_yogurt",
      supplierId: ids.tnuva,
      name: "יוגורט יווני 8% 150ג",
      sku: "TNV-GRK-8",
      notes: "מוצר מדף קירור",
      stockStandard: 18,
      agreedPrice: 4.9,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 3,
      bagsToUnits: 8,
      packagingNotes: null,
    },
    {
      id: "prd_ketchup",
      supplierId: ids.strauss,
      name: "קטשופ שף 2ק״ג",
      sku: "STR-KET-2",
      notes: "",
      stockStandard: 6,
      agreedPrice: 22,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 6,
      packagingNotes: "קרטון = 6 דליים",
    },
    {
      id: "prd_mayo",
      supplierId: ids.strauss,
      name: "מיונז 3ק״ג",
      sku: "STR-MAY-3",
      notes: "",
      stockStandard: 4,
      agreedPrice: 28,
      discountPercent: 8,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 4,
      packagingNotes: null,
    },
    {
      id: "prd_chocolate",
      supplierId: ids.strauss,
      name: "שוקולד מריר למאפים 5ק״ג",
      sku: "STR-CHOC-5",
      notes: "לפי הזמנה מיוחדת",
      stockStandard: 2,
      agreedPrice: 145,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: null,
      bagsToUnits: null,
      packagingNotes: "שק 5ק״ג",
    },
    {
      id: "prd_cherry",
      supplierId: ids.vegetables,
      name: "עגבניות שרי 2ק״ג",
      sku: "SHR-CHERRY",
      notes: "לבדוק בשלות",
      stockStandard: 10,
      agreedPrice: 18,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 1,
      packagingNotes: "מארז 2ק״ג",
    },
    {
      id: "prd_lettuce",
      supplierId: ids.vegetables,
      name: "חסה רומית",
      sku: "SHR-ROM",
      notes: "",
      stockStandard: 16,
      agreedPrice: 7.5,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 8,
      packagingNotes: "קרטון ≈ 8 ראשים",
    },
    {
      id: "prd_onion",
      supplierId: ids.vegetables,
      name: "בצל יבש שק 10ק״ג",
      sku: "SHR-ONI-10",
      notes: "",
      stockStandard: 2,
      agreedPrice: 24,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: null,
      bagsToUnits: null,
      packagingNotes: "שק",
    },
    {
      id: "prd_potato",
      supplierId: ids.vegetables,
      name: "תפוח אדמה שק 10ק״ג",
      sku: "SHR-POT-10",
      notes: "",
      stockStandard: 3,
      agreedPrice: 22,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: null,
      bagsToUnits: null,
      packagingNotes: "שק",
    },
    {
      id: "prd_oil",
      supplierId: ids.warehouse,
      name: "שמן קנולה 5 ליטר",
      sku: "SHK-OIL-5",
      notes: "מחיר ללא מע״מ",
      stockStandard: 4,
      agreedPrice: 42,
      discountPercent: 0,
      vatIncluded: false,
      cartonToBags: 1,
      bagsToUnits: 4,
      packagingNotes: "קרטון = 4 מיכלים",
      documentType: "TAX_INVOICE",
    },
    {
      id: "prd_flour",
      supplierId: ids.warehouse,
      name: "קמח פיצה 25ק״ג",
      sku: "SHK-FLR-25",
      notes: "חובה לתת יח׳ בכפולות שק",
      stockStandard: 6,
      agreedPrice: 68,
      discountPercent: 3,
      vatIncluded: false,
      cartonToBags: null,
      bagsToUnits: null,
      packagingNotes: "שק 25ק״ג",
      documentType: "DELIVERY_NOTE",
    },
    {
      id: "prd_salt",
      supplierId: ids.warehouse,
      name: "מלח גס 1ק״ג",
      sku: "SHK-SALT-1",
      notes: "",
      stockStandard: 8,
      agreedPrice: 4.5,
      discountPercent: 0,
      vatIncluded: true,
      cartonToBags: 1,
      bagsToUnits: 10,
      packagingNotes: "קרטון = 10 שקיות",
      documentType: "TAX_INVOICE",
    },
  ];

  for (const product of products) {
    const networkRebatePercent = product.supplierId === ids.tnuva ? 8 : 0;
    const saved = await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        sku: product.sku,
        notes: product.notes,
        stockStandard: product.stockStandard,
        agreedPrice: product.agreedPrice,
        discountPercent: product.discountPercent,
        vatIncluded: product.vatIncluded,
        cartonToBags: product.cartonToBags,
        bagsToUnits: product.bagsToUnits,
        packagingNotes: product.packagingNotes,
        documentType: product.documentType ?? null,
        categoryId: PRODUCT_CATEGORY_ASSIGNMENTS[product.id] ?? null,
        networkRebatePercent,
        networkPlusPercent: 0,
      },
      create: {
        ...product,
        categoryId: PRODUCT_CATEGORY_ASSIGNMENTS[product.id] ?? null,
        networkRebatePercent,
        networkPlusPercent: 0,
      },
    });
    await syncProductPriceLists(saved);
  }
  for (const supplierId of [ids.tnuva, ids.strauss, ids.vegetables, ids.warehouse]) {
    await ensurePriceLists(supplierId);
  }

  const existingOpen = await prisma.order.findUnique({ where: { id: ids.orderOpen } });
  if (!existingOpen) {
    await prisma.order.create({
      data: {
        id: ids.orderOpen,
        supplierId: ids.vegetables,
        branchId: ids.herzliya,
        status: "SENT",
        notesForDriver: "להוריד במחסן האחורי לפני 10:00. לא לצלצל לטרקלין.",
        lines: {
          create: [
            { productId: "prd_cherry", qty: 10, unitPrice: 18, discountPercent: 0 },
            { productId: "prd_lettuce", qty: 16, unitPrice: 7.5, discountPercent: 0 },
            { productId: "prd_onion", qty: 2, unitPrice: 24, discountPercent: 0 },
          ],
        },
      },
    });
  }

  const existingPending = await prisma.order.findUnique({ where: { id: ids.orderPending } });
  if (!existingPending) {
    const order = await prisma.order.create({
      data: {
        id: ids.orderPending,
        supplierId: ids.tnuva,
        branchId: ids.herzliya,
        status: "RECEIVED",
        notesForDriver: "יש מלאי חלקי במקרר — להשלים לפי הרשימה.",
        lines: {
          create: [
            { productId: "prd_milk", qty: 24, unitPrice: 6.9, discountPercent: 0 },
            { productId: "prd_cheese", qty: 8, unitPrice: 18.5, discountPercent: 5 },
            { productId: "prd_cream", qty: 12, unitPrice: 8.2, discountPercent: 0 },
          ],
        },
      },
      include: { lines: true },
    });

    const milk = order.lines.find((l) => l.productId === "prd_milk")!;
    const cheese = order.lines.find((l) => l.productId === "prd_cheese")!;
    const cream = order.lines.find((l) => l.productId === "prd_cream")!;

    const uploads = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploads, { recursive: true });
    const fileName = "demo-tnuva-invoice.svg";
    await writeFile(path.join(uploads, fileName), DEMO_INVOICE_SVG, "utf8");

    await prisma.goodsReceipt.create({
      data: {
        id: ids.receiptPending,
        orderId: order.id,
        status: "PENDING_PRICE_APPROVAL",
        notes: "הגבינה הגיעה במחיר גבוה מהמוסכם.",
        accountId: "acc_food_dairy",
        lines: {
          create: [
            {
              orderLineId: milk.id,
              receivedQty: 24,
              invoicePrice: 6.9,
              missing: false,
              wrongPrice: false,
            },
            {
              orderLineId: cheese.id,
              receivedQty: 8,
              invoicePrice: 21.9,
              missing: false,
              wrongPrice: true,
              priceChangeStatus: "PENDING",
            },
            {
              orderLineId: cream.id,
              receivedQty: 10,
              invoicePrice: 8.2,
              missing: true,
              wrongPrice: false,
            },
          ],
        },
        photos: {
          create: {
            id: ids.photoPending,
            accountId: "acc_food_dairy",
            amountIls: 24 * 6.9 + 8 * 21.9 + 10 * 8.2,
            voiceNoteText: "חשבונית תנובה מהבוקר, גבינות ומוצרי חלב",
            fileName,
            originalName: "tnuva-invoice-demo.svg",
            mimeType: "image/svg+xml",
            periodMonth: "2026-08",
            source: "RECEIPT",
            classifiedAt: new Date("2026-08-18T08:00:00"),
          },
        },
      },
    });
  } else {
    await prisma.goodsReceipt.update({
      where: { id: ids.receiptPending },
      data: { accountId: "acc_food_dairy" },
    });
    await prisma.invoicePhoto.updateMany({
      where: { id: ids.photoPending },
      data: {
          accountId: "acc_food_dairy",
          amountIls: 24 * 6.9 + 8 * 21.9 + 10 * 8.2,
          voiceNoteText: "חשבונית תנובה מהבוקר, גבינות ומוצרי חלב",
          periodMonth: "2026-08",
          source: "RECEIPT",
          classifiedAt: new Date("2026-08-18T08:00:00"),
        },
    });
  }

  const extraDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(extraDir, { recursive: true });

  const extraDocs = [
    {
      id: "photo_electricity",
      fileName: "demo-electricity.svg",
      originalName: "חשמל-אוגוסט.svg",
      accountId: "acc_energy_electricity",
      amountIls: 1840,
      voiceNoteText: "חשמל חודש אוגוסט סניף הרצליה",
      title: "חשבונית חשמל",
    },
    {
      id: "photo_kitchen_wages",
      fileName: "demo-kitchen-wages.svg",
      originalName: "שכר-מטבח-אוגוסט.svg",
      accountId: "acc_payroll_kitchen",
      amountIls: 12600,
      voiceNoteText: "משכורות עובדי מטבח אוגוסט",
      title: "שכר עובדי מטבח",
    },
    {
      id: "photo_produce_aug",
      fileName: "demo-produce-aug.svg",
      originalName: "ירקות-אוגוסט.svg",
      accountId: "acc_food_produce",
      amountIls: 2140,
      voiceNoteText: "ירקות השרון אוגוסט",
      title: "חשבונית ירקות",
    },
    {
      id: "photo_rent_aug",
      fileName: "demo-rent-aug.svg",
      originalName: "שכירות-חנות-אוגוסט.svg",
      accountId: "acc_premises_store_rent",
      amountIls: 18500,
      voiceNoteText: "שכר דירה חנות אוגוסט",
      title: "שכר דירה חנות",
    },
  ];

  for (const doc of extraDocs) {
    await writeFile(
      path.join(extraDir, doc.fileName),
      DEMO_INVOICE_SVG.replace("חשבונית מס / תעודת משלוח", doc.title),
      "utf8",
    );
    await prisma.invoicePhoto.upsert({
      where: { id: doc.id },
      update: {
        accountId: doc.accountId,
        amountIls: doc.amountIls,
        voiceNoteText: doc.voiceNoteText,
        fileName: doc.fileName,
        originalName: doc.originalName,
        periodMonth: "2026-08",
        source: "MANUAL",
        classifiedAt: new Date("2026-08-28T10:00:00"),
      },
      create: {
        id: doc.id,
        accountId: doc.accountId,
        amountIls: doc.amountIls,
        voiceNoteText: doc.voiceNoteText,
        fileName: doc.fileName,
        originalName: doc.originalName,
        mimeType: "image/svg+xml",
        periodMonth: "2026-08",
        source: "MANUAL",
        classifiedAt: new Date("2026-08-28T10:00:00"),
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "standardFoodCostPercent" },
    update: { value: "28" },
    create: { key: "standardFoodCostPercent", value: "28" },
  });
  await prisma.appSetting.upsert({
    where: { key: "dashboard.forecastTurnoverIls" },
    update: {},
    create: { key: "dashboard.forecastTurnoverIls", value: "200000" },
  });

  await prisma.recurringLine.upsert({
    where: { id: "rec_rent" },
    update: { name: "שכירות חנות", kind: "EXPENSE", cadence: "FIXED", amountIls: 18500 },
    create: { id: "rec_rent", name: "שכירות חנות", kind: "EXPENSE", cadence: "FIXED", amountIls: 18500 },
  });
  await prisma.recurringLine.upsert({
    where: { id: "rec_turnover" },
    update: { name: "מחזור חזוי", kind: "INCOME", cadence: "VARIABLE", amountIls: 200000 },
    create: { id: "rec_turnover", name: "מחזור חזוי", kind: "INCOME", cadence: "VARIABLE", amountIls: 200000 },
  });

  await prisma.dish.upsert({
    where: { id: "dish_dough" },
    update: { name: "בצק פיצה (מנת ביניים)", sellPrice: null },
    create: {
      id: "dish_dough",
      name: "בצק פיצה (מנת ביניים)",
      kind: "INTERMEDIATE",
      notes: "מנה אחת = בצק ל-4 מגשים",
      components: {
        create: [
          { productId: "prd_flour", qty: 0.08, notes: "כ-2ק״ג מתוך שק 25ק״ג" },
          { productId: "prd_salt", qty: 0.04, notes: "מלח לשקילת בצק" },
          { productId: "prd_oil", qty: 0.05, notes: "שמן לקערה" },
        ],
      },
    },
  });

  await prisma.dish.upsert({
    where: { id: "dish_sauce" },
    update: { name: "רוטב עגבניות (מנת ביניים)", sellPrice: null },
    create: {
      id: "dish_sauce",
      name: "רוטב עגבניות (מנת ביניים)",
      kind: "INTERMEDIATE",
      notes: "מנה אחת = רוטב ל-4 פיצות",
      components: {
        create: [
          { productId: "prd_cherry", qty: 0.5, notes: "1ק״ג מתוך מארז 2ק״ג" },
          { productId: "prd_ketchup", qty: 0.15, notes: "בסיס מתוק" },
          { productId: "prd_salt", qty: 0.02 },
        ],
      },
    },
  });

  const doughHasComponents = await prisma.dishComponent.count({ where: { dishId: "dish_dough" } });
  if (doughHasComponents === 0) {
    await prisma.dishComponent.createMany({
      data: [
        { dishId: "dish_dough", productId: "prd_flour", qty: 0.08, notes: "כ-2ק״ג מתוך שק 25ק״ג" },
        { dishId: "dish_dough", productId: "prd_salt", qty: 0.04, notes: "מלח לשקילת בצק" },
        { dishId: "dish_dough", productId: "prd_oil", qty: 0.05, notes: "שמן לקערה" },
      ],
    });
  }
  const sauceHasComponents = await prisma.dishComponent.count({ where: { dishId: "dish_sauce" } });
  if (sauceHasComponents === 0) {
    await prisma.dishComponent.createMany({
      data: [
        { dishId: "dish_sauce", productId: "prd_cherry", qty: 0.5, notes: "1ק״ג מתוך מארז 2ק״ג" },
        { dishId: "dish_sauce", productId: "prd_ketchup", qty: 0.15, notes: "בסיס מתוק" },
        { dishId: "dish_sauce", productId: "prd_salt", qty: 0.02 },
      ],
    });
  }

  await prisma.dish.upsert({
    where: { id: "dish_margherita" },
    update: { name: "פיצה מרגריטה", sellPrice: 62, standardCostPercent: 28 },
    create: {
      id: "dish_margherita",
      name: "פיצה מרגריטה",
      kind: "DISH",
      sellPrice: 62,
      standardCostPercent: 28,
      notes: "מגש אישי",
    },
  });
  if ((await prisma.dishComponent.count({ where: { dishId: "dish_margherita" } })) === 0) {
    await prisma.dishComponent.createMany({
      data: [
        { dishId: "dish_margherita", componentDishId: "dish_dough", qty: 0.25, notes: "רבע בצק" },
        { dishId: "dish_margherita", componentDishId: "dish_sauce", qty: 0.25, notes: "רבע רוטב" },
        { dishId: "dish_margherita", productId: "prd_cheese", qty: 0.2, notes: "כ-80ג גבינה" },
      ],
    });
  }

  await prisma.dish.upsert({
    where: { id: "dish_salad" },
    update: { name: "סלט ירקות השרון", sellPrice: 38, standardCostPercent: 26 },
    create: {
      id: "dish_salad",
      name: "סלט ירקות השרון",
      kind: "DISH",
      sellPrice: 38,
      standardCostPercent: 26,
    },
  });
  if ((await prisma.dishComponent.count({ where: { dishId: "dish_salad" } })) === 0) {
    await prisma.dishComponent.createMany({
      data: [
        { dishId: "dish_salad", productId: "prd_lettuce", qty: 0.5 },
        { dishId: "dish_salad", productId: "prd_cherry", qty: 0.25 },
        { dishId: "dish_salad", productId: "prd_onion", qty: 0.1 },
      ],
    });
  }

  const existingCount = await prisma.inventoryCount.findUnique({ where: { id: "count_open_herzliya" } });
  if (!existingCount) {
    const allProducts = await prisma.product.findMany({ select: { id: true, stockStandard: true } });
    await prisma.inventoryCount.create({
      data: {
        id: "count_open_herzliya",
        branchId: ids.herzliya,
        countedOn: new Date("2026-09-06T07:30:00"),
        status: "OPEN",
        notes: "ספירת בוקר פתוחה — להשלים לפני הזמנת תנובה",
        lines: {
          create: allProducts.map((product) => ({
            productId: product.id,
            countedQty: Math.max(0, Math.round(product.stockStandard * 0.4)),
          })),
        },
      },
    });
  }

  console.log("Vivac'e demo data is ready.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
