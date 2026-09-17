import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { CompactPanel } from "@/components/ui/compact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="משתמשים"
        description="כל אחד נכנס עם שם משתמש וסיסמה משלו. התפקיד קובע מה רואים ומה מותר לבצע."
      />

      <CompactPanel
        title="משתמש חדש"
        description="אחרי יצירה מופיעה סיסמה זמנית להעתקה — מוסרים ידנית, אין מייל."
      >
        <CreateUserPanel branches={branches} />
      </CompactPanel>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>כל המשתמשים</CardTitle>
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
