import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    await prisma.product.upsert({
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
      },
      create: product,
    });
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
        expenseCategory: "FOOD",
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
            expenseCategory: "FOOD",
            voiceNoteText: "חשבונית תנובה מהבוקר, עלות מזון",
            fileName,
            originalName: "tnuva-invoice-demo.svg",
            mimeType: "image/svg+xml",
          },
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
