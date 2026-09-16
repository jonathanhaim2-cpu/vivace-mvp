"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import {
  APP_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  isAppRole,
  isLockedAdminPermission,
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/roles";

function revalidatePermissions() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/permissions");
}

export async function setRolePermission(role: string, key: string, allowed: boolean) {
  await requirePermission("action.manage_permissions");
  if (!isAppRole(role)) throw new Error("תפקיד לא חוקי");
  if (!PERMISSION_KEYS.includes(key as PermissionKey)) throw new Error("הרשאה לא חוקית");
  if (isLockedAdminPermission(role, key) && !allowed) {
    throw new Error("לא ניתן לבטל הרשאות ליבה של אדמין");
  }
  await prisma.rolePermission.upsert({
    where: { role_key: { role, key } },
    update: { allowed },
    create: { role, key, allowed },
  });
  revalidatePermissions();
}

export async function restoreDefaultPermissions() {
  await requirePermission("action.manage_permissions");
  for (const role of APP_ROLES) {
    for (const key of PERMISSION_KEYS) {
      const allowed = DEFAULT_ROLE_PERMISSIONS[role].includes(key);
      await prisma.rolePermission.upsert({
        where: { role_key: { role, key } },
        update: { allowed },
        create: { role, key, allowed },
      });
    }
  }
  revalidatePermissions();
}
