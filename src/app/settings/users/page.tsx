import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserPanel } from "@/components/users/user-form";
import { UsersAdmin } from "@/components/users/users-admin";
import { requirePagePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const session = await requirePagePermission("action.manage_users");
  const [users, branches] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { branches: { include: { branch: true } } },
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="משתמשים"
        description="כל אחד נכנס עם שם משתמש וסיסמה משלו. התפקיד קובע מה רואים ומה מותר לבצע."
      />

      <Card>
        <CardHeader>
          <CardTitle>משתמש חדש</CardTitle>
          <CardDescription>
            אחרי היצירה תופיע כרטיס סיסמה זמנית להעתקה. אין שליחת מייל כרגע — מוסרים את הפרטים ידנית.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserPanel branches={branches} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כל המשתמשים</CardTitle>
          <CardDescription>עריכה, השבתה ואיפוס סיסמה. אי אפשר להשבית את האדמין הפעיל האחרון.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersAdmin
            users={users.map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
              role: user.role,
              active: user.active,
              branchIds: user.branches.map((link) => link.branchId),
              branchNames: user.branches.map((link) => link.branch.name),
            }))}
            branches={branches}
          />
        </CardContent>
      </Card>
    </div>
  );
}
