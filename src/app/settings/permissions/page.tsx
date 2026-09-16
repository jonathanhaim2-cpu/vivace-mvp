import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { APP_ROLES, resolveRolePermissions, type AppRole, type PermissionKey } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function PermissionsSettingsPage() {
  const session = await requirePagePermission("action.manage_permissions");
  const rows = await prisma.rolePermission.findMany();
  const byRole = new Map<string, { key: string; allowed: boolean }[]>();
  for (const row of rows) {
    const list = byRole.get(row.role) ?? [];
    list.push({ key: row.key, allowed: row.allowed });
    byRole.set(row.role, list);
  }

  const initial = Object.fromEntries(
    APP_ROLES.map((role) => [
      role,
      [...resolveRolePermissions(role, byRole.get(role) ?? [])],
    ]),
  ) as Record<AppRole, PermissionKey[]>;

  return (
    <div className="space-y-6">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="טבלת שליטה"
        description="מה כל תפקיד רואה בתפריט, ומה מותר לו לבצע. השינויים נשמרים במסד ונכנסים לתוקף מיד."
      />
      <Card>
        <CardHeader>
          <CardTitle>הרשאות לפי תפקיד</CardTitle>
          <CardDescription>
            שורות = מסכים ופעולות. עמודות = תפקידים. הרשאות ליבה של אדמין נעולות כדי לא להינעל מחוץ למערכת.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionMatrix initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
