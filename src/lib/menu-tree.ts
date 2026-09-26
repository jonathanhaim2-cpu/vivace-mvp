import { prisma } from "@/lib/prisma";

export const MENU_ROOTS = [
  { systemKey: "menu-pizza", name: "פיצות", sortOrder: 1, children: [
    { systemKey: "menu-pizza-s", name: "סמול", sortOrder: 1 },
    { systemKey: "menu-pizza-m", name: "מדיום", sortOrder: 2 },
    { systemKey: "menu-pizza-l", name: "לארג׳", sortOrder: 3 },
  ]},
  { systemKey: "menu-pasta", name: "פסטות", sortOrder: 2, children: [] },
  { systemKey: "menu-salads", name: "סלטים", sortOrder: 3, children: [] },
  { systemKey: "menu-starters", name: "ראשונות", sortOrder: 4, children: [] },
  { systemKey: "menu-desserts", name: "קינוחים", sortOrder: 5, children: [] },
  { systemKey: "menu-drinks", name: "שתייה", sortOrder: 6, children: [] },
] as const;

/** Idempotent. Never deletes dishes or categories that already exist. */
export async function ensureMenuTree() {
  for (const root of MENU_ROOTS) {
    const parent = await prisma.dish.upsert({
      where: { systemKey: root.systemKey },
      update: { name: root.name, sortOrder: root.sortOrder, nodeKind: "CATEGORY" },
      create: {
        name: root.name,
        kind: "DISH",
        nodeKind: "CATEGORY",
        systemKey: root.systemKey,
        sortOrder: root.sortOrder,
        sellPrice: null,
      },
    });
    for (const child of root.children) {
      await prisma.dish.upsert({
        where: { systemKey: child.systemKey },
        update: { name: child.name, sortOrder: child.sortOrder, nodeKind: "CATEGORY", parentId: parent.id },
        create: {
          name: child.name,
          kind: "DISH",
          nodeKind: "CATEGORY",
          systemKey: child.systemKey,
          sortOrder: child.sortOrder,
          parentId: parent.id,
          sellPrice: null,
        },
      });
    }
  }
}
