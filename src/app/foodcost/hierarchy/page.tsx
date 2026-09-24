import Link from "next/link";
import { createCategory, renameCategory } from "@/actions/categories";
import { createHierarchyProduct, setProductCategory } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FoodCostHierarchyPage() {
  const [tree, products, suppliers] = await Promise.all([
    listCategoryTree(),
    prisma.product.findMany({
      include: { supplier: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const children = tree.flatMap((parent) => parent.children);

  return (
    <div className="space-y-5">
      <PageHeader
        title="היררכיית עלות מזון"
        description="שלוש רמות: קטגוריה, תת־קטגוריה, ומוצר. המוצר תמיד יושב על תת־קטגוריה."
        action={{ href: "/foodcost", label: "עצי מוצר" }}
      />
      <CompactPanel title="קטגוריה או תת־קטגוריה">
        <CompactForm action={createCategory}>
          <CompactField label="שם" htmlFor="h-name" grow>
            <Input id="h-name" name="name" required />
          </CompactField>
          <CompactField label="אב" htmlFor="h-parent">
            <NativeSelect id="h-parent" name="parentId">
              <option value="">קטגוריה</option>
              {tree.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  תחת {parent.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <Button type="submit">הוספה</Button>
        </CompactForm>
      </CompactPanel>
      <CompactPanel title="מוצר חדש" description="נוצר אצל הספק ונכנס לתת־קטגוריה.">
        <form action={createHierarchyProduct} className="grid gap-3 sm:grid-cols-2">
          <CompactField label="שם" htmlFor="p-name">
            <Input id="p-name" name="name" required />
          </CompactField>
          <CompactField label="ספק" htmlFor="p-supplier">
            <NativeSelect id="p-supplier" name="supplierId" required>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="תת־קטגוריה" htmlFor="p-cat">
            <NativeSelect id="p-cat" name="categoryId" required>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="מחיר מוסכם" htmlFor="p-price">
            <Input id="p-price" name="agreedPrice" type="number" min={0} step="0.01" defaultValue={0} />
          </CompactField>
          <input type="hidden" name="stockStandard" value="0" />
          <div className="sm:col-span-2">
            <Button type="submit">יצירת מוצר</Button>
          </div>
        </form>
      </CompactPanel>
      {tree.map((parent) => (
        <section key={parent.id} className="rounded-2xl border bg-card p-4">
          <form action={renameCategory.bind(null, parent.id)} className="flex flex-wrap gap-2">
            <Input name="name" defaultValue={parent.name} className="max-w-xs" />
            <Button type="submit" size="sm" variant="outline">
              שינוי שם קטגוריה
            </Button>
          </form>
          {parent.children.map((child) => {
            const rows = products.filter((product) => product.categoryId === child.id);
            return (
              <div key={child.id} className="mt-3 border-t border-border/70 pt-3">
                <form action={renameCategory.bind(null, child.id)} className="flex flex-wrap gap-2">
                  <Input name="name" defaultValue={child.name} className="max-w-xs" />
                  <Button type="submit" size="sm" variant="ghost">
                    שינוי תת־קטגוריה
                  </Button>
                </form>
                <ul className="mt-2 space-y-2">
                  {rows.map((product) => (
                    <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={`/products/${product.id}/edit`} className="hover:underline">
                        {product.name}
                        <span className="text-muted-foreground"> · {product.supplier.name}</span>
                      </Link>
                      <form action={setProductCategory.bind(null, product.id)} className="flex gap-2">
                        <NativeSelect name="categoryId" defaultValue={product.categoryId ?? ""}>
                          {children.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          העברה
                        </Button>
                      </form>
                    </li>
                  ))}
                  {rows.length === 0 ? <li className="text-xs text-muted-foreground">אין מוצרים</li> : null}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
      <p className="text-xs text-muted-foreground">
        <Link href="/categories" className="underline">
          מסך הקטגוריות המלא
        </Link>
      </p>
    </div>
  );
}
