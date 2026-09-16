import * as XLSX from "xlsx";
import { getAccountRollup } from "@/lib/accounts";
import { getNonProcurementChecklist, getSupplierApRows, payMethodLabel } from "@/lib/ap";
import { getAnomalies } from "@/lib/dashboard";
import { computeDishCost, foodCostPercent, hierarchicalFoodCost } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { monthLabel, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export type ReportKind = "monthly" | "waste" | "ap" | "foodcost" | "anomalies";

export type ReportTable = {
  title: string;
  filename: string;
  sheets: { name: string; rows: (string | number)[][] }[];
};

function sheet(name: string, header: string[], body: (string | number)[][]): { name: string; rows: (string | number)[][] } {
  return { name: name.slice(0, 31), rows: [header, ...body] };
}

export async function buildReportTable(kind: ReportKind, month: string): Promise<ReportTable> {
  const label = monthLabel(month);
  if (kind === "monthly") {
    const rollup = await getAccountRollup(month);
    const rows: (string | number)[][] = [];
    for (const parent of rollup) {
      rows.push([parent.kind === "EXPENSE" ? "הוצאה" : "הכנסה", parent.name, "", parent.amount, parent.documents]);
      for (const child of parent.children) {
        rows.push(["", parent.name, child.name, child.amount, child.documents]);
      }
    }
    return {
      title: `דוח תחילת חודש · ${label}`,
      filename: `vivace-monthly-${month}.xlsx`,
      sheets: [sheet("דוח חודשי", ["סוג", "אב", "קטגוריה", "סכום ₪", "מסמכים"], rows)],
    };
  }

  if (kind === "waste") {
    const { start, end } = monthRangeUtc(month);
    const entries = await prisma.wasteEntry.findMany({
      where: { occurredOn: { gte: start, lt: end } },
      include: { branch: true, product: true },
      orderBy: { occurredOn: "desc" },
    });
    const rows = entries.map((entry) => [
      entry.occurredOn.toISOString().slice(0, 10),
      entry.branch.name,
      entry.product?.name ?? "",
      entry.qty,
      entry.estimatedCost,
      entry.notes ?? "",
    ]);
    return {
      title: `דוח פחת · ${label}`,
      filename: `vivace-waste-${month}.xlsx`,
      sheets: [sheet("פחת", ["תאריך", "סניף", "מוצר", "כמות", "עלות ₪", "הערה"], rows)],
    };
  }

  if (kind === "ap") {
    const [rows, expenses] = await Promise.all([getSupplierApRows(month), getNonProcurementChecklist(month)]);
    const supplierRows = rows.map((row) => [
      row.supplier.name,
      row.amountDue,
      row.purchased,
      row.ap?.approvedForPayment ? "כן" : "לא",
      payMethodLabel(row.ap?.payMethod ?? row.supplier.paymentMethod),
      row.supplier.accountingEmail ?? "",
    ]);
    const expenseRows = expenses.map((item) => [
      item.originalName,
      item.amountIls ?? 0,
      item.account?.name ?? "ללא סיווג",
      item.paid ? "שולם" : "לא שולם",
      item.sentToAccountant ? "נשלח" : "לא נשלח",
    ]);
    return {
      title: `תשלומים לספקים · ${label}`,
      filename: `vivace-ap-${month}.xlsx`,
      sheets: [
        sheet("ספקים", ["ספק", "לתשלום ₪", "רכש ₪", "אושר", "אמצעי", "מייל הנה״ח"], supplierRows),
        sheet("הוצאות לא מרכש", ["מסמך", "סכום ₪", "כרטיס", "שולם", "להנה״ח"], expenseRows),
      ],
    };
  }

  if (kind === "foodcost") {
    const [dishes, products] = await Promise.all([
      prisma.dish.findMany({ include: { components: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
      prisma.product.findMany({ include: { category: { include: { parent: true } } } }),
    ]);
    const costDishes = dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      kind: dish.kind,
      sellPrice: dish.sellPrice,
      standardCostPercent: dish.standardCostPercent,
      components: dish.components,
    }));
    const tree = hierarchicalFoodCost(costDishes, products);
    const rows: (string | number)[][] = [["סה״כ", tree.name, tree.cost, tree.sell, tree.percent ?? ""]];
    for (const dept of tree.children) {
      rows.push(["מחלקה", dept.name, dept.cost, dept.sell, dept.percent ?? ""]);
      for (const sub of dept.children) {
        rows.push(["תת־קטגוריה", sub.name, sub.cost, sub.sell, sub.percent ?? ""]);
        for (const dish of sub.children) {
          rows.push(["מנה", dish.name, dish.cost, dish.sell, dish.percent ?? ""]);
        }
      }
    }
    const dishRows = dishes.map((dish) => {
      const { cost } = computeDishCost(dish.id, costDishes, products);
      const percent = foodCostPercent(cost, dish.sellPrice);
      return [
        dish.name,
        dish.kind === "INTERMEDIATE" ? "ביניים" : "מכירה",
        cost,
        dish.sellPrice ?? "",
        percent ?? "",
        dish.standardCostPercent,
      ];
    });
    return {
      title: `Food Cost · ${label}`,
      filename: `vivace-foodcost-${month}.xlsx`,
      sheets: [
        sheet("רולאפ", ["רמה", "שם", "עלות ₪", "מכירה ₪", "%"], rows),
        sheet("מנות", ["מנה", "סוג", "עלות ₪", "מכירה ₪", "% בפועל", "תקן %"], dishRows),
      ],
    };
  }

  const anomalies = await getAnomalies();
  const priceRows = anomalies.pricePending.map((receipt) => [
    receipt.order.supplier.name,
    receipt.order.branch.name,
    receipt.id,
    "מחיר שונה",
  ]);
  const missingRows = anomalies.missing.map((line) => [
    line.goodsReceipt.order.supplier.name,
    line.orderLine.product.name,
    line.id,
    "חוסר",
  ]);
  const exceptionalRows = anomalies.exceptional.map((item) => [
    item.supplier.name,
    item.productName,
    item.kind,
    item.amountIls,
  ]);
  return {
    title: "מסמכים חריגים",
    filename: `vivace-anomalies-${month}.xlsx`,
    sheets: [
      sheet("חריגים", ["ספק", "פריט", "סוג", "סכום ₪"], exceptionalRows),
      sheet("מחיר", ["ספק", "סניף", "מזהה", "סוג"], priceRows),
      sheet("חוסר", ["ספק", "מוצר", "מזהה", "סוג"], missingRows),
      sheet("ללא סיווג", ["כמות"], [[anomalies.unclassified]]),
    ],
  };
}

export function reportToXlsxBuffer(table: ReportTable) {
  const workbook = XLSX.utils.book_new();
  for (const item of table.sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(item.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, item.name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function formatReportCell(value: string | number) {
  return typeof value === "number" ? formatIls(value) : value;
}
