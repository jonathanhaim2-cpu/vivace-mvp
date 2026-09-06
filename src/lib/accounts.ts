import { CHART_OF_ACCOUNTS, isChartLeafId } from "@/lib/chart-of-accounts";
import { monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";

function inMonth(month: string) {
  const { start, end } = monthRangeUtc(month);
  return { gte: start, lt: end };
}

export async function seedChartOfAccounts() {
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

export async function assertLeafAccount(accountId: string) {
  if (!isChartLeafId(accountId)) {
    throw new Error("יש לבחור כרטיס בן (לא קטגוריית אב)");
  }
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || !account.parentId) {
    throw new Error("כרטיס לא נמצא או שאינו כרטיס בן");
  }
  return account;
}

export async function getAccountTree() {
  return prisma.account.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
}

export type AccountRollupRow = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  documents: number;
  amount: number;
  children: {
    id: string;
    name: string;
    documents: number;
    amount: number;
  }[];
};

export async function getAccountRollup(month?: string): Promise<AccountRollupRow[]> {
  const photos = await prisma.invoicePhoto.findMany({
    where: month
      ? {
          OR: [{ periodMonth: month }, { periodMonth: null, createdAt: inMonth(month) }],
        }
      : undefined,
    include: {
      account: true,
      goodsReceipt: { include: { lines: true } },
    },
  });

  const byLeaf = new Map<string, { documents: number; amount: number }>();

  for (const photo of photos) {
    if (!photo.accountId) continue;
    const receiptAmount =
      photo.goodsReceipt?.lines.reduce((sum, line) => sum + line.receivedQty * line.invoicePrice, 0) ?? 0;
    const amount = photo.amountIls ?? (receiptAmount > 0 ? receiptAmount : 0);
    const current = byLeaf.get(photo.accountId) ?? { documents: 0, amount: 0 };
    current.documents += 1;
    current.amount += amount;
    byLeaf.set(photo.accountId, current);
  }

  if (month) {
    const receiptsWithoutPhotos = await prisma.goodsReceipt.findMany({
      where: {
        accountId: { not: null },
        photos: { none: {} },
        createdAt: inMonth(month),
      },
      include: { lines: true },
    });
    for (const receipt of receiptsWithoutPhotos) {
      if (!receipt.accountId) continue;
      const amount = receipt.lines.reduce((sum, line) => sum + line.receivedQty * line.invoicePrice, 0);
      const current = byLeaf.get(receipt.accountId) ?? { documents: 0, amount: 0 };
      current.documents += 1;
      current.amount += amount;
      byLeaf.set(receipt.accountId, current);
    }
  }

  return CHART_OF_ACCOUNTS.map((parent) => {
    const children = parent.children.map((child) => {
      const stats = byLeaf.get(child.id) ?? { documents: 0, amount: 0 };
      return { id: child.id, name: child.name, ...stats };
    });
    return {
      id: parent.id,
      name: parent.name,
      kind: parent.kind,
      parentId: null,
      documents: children.reduce((sum, child) => sum + child.documents, 0),
      amount: children.reduce((sum, child) => sum + child.amount, 0),
      children,
    };
  });
}
