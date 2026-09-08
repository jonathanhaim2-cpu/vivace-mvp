import { createCategory, deleteCategory, renameCategory } from "@/actions/categories";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCategoryTree } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const tree = await listCategoryTree();

  return (
    <div className="space-y-6">
      <PageHeader
        title="קטגוריות מוצרים"
        description="שתי רמות: קטגוריה ותת־קטגוריה. השיבוץ למוצר הוא תמיד לתת־קטגוריה. האב משמש לסינון ולדוחות."
      />

      <Card>
        <CardHeader>
          <CardTitle>קטגוריה חדשה</CardTitle>
          <CardDescription>אב חדש, או תת־קטגוריה תחת אב קיים.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input name="name" placeholder="שם" required className="sm:max-w-xs" />
            <select name="parentId" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              <option value="">קטגוריית אב</option>
              {tree.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  תת־קטגוריה תחת {parent.name}
                </option>
              ))}
            </select>
            <Button type="submit">הוספה</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tree.map((parent) => (
          <Card key={parent.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{parent.name}</CardTitle>
                <CardDescription>{parent.children.length} תתי־קטגוריות</CardDescription>
              </div>
              <form action={renameCategory.bind(null, parent.id)} className="flex gap-2">
                <Input name="name" defaultValue={parent.name} className="w-40" />
                <Button type="submit" size="sm" variant="outline">
                  שינוי שם
                </Button>
              </form>
            </CardHeader>
            <CardContent className="space-y-2">
              {parent.children.map((child) => (
                <div key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <p className="text-sm">{child.name}</p>
                  <div className="flex gap-2">
                    <form action={renameCategory.bind(null, child.id)} className="flex gap-2">
                      <Input name="name" defaultValue={child.name} className="w-36" />
                      <Button type="submit" size="sm" variant="outline">
                        שינוי
                      </Button>
                    </form>
                    <form action={deleteCategory.bind(null, child.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        מחיקה
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
