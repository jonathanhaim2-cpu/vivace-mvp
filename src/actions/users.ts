"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeUsername,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "@/lib/passwords";
import {
  canDeactivateOrDemote,
  isAppRole,
  isBranchScopedRole,
  parseAppRole,
  type AppRole,
} from "@/lib/roles";

export type CredentialsPayload = {
  name: string;
  username: string;
  password: string;
  mode: "created" | "reset";
};

export type UserActionState = {
  error?: string;
  credentials?: CredentialsPayload;
} | null;

function readBranchIds(formData: FormData) {
  return [...new Set(formData.getAll("branchId").map((value) => String(value).trim()).filter(Boolean))];
}

function readActive(formData: FormData) {
  return formData.getAll("active").some((value) => value === "on" || value === "true" || value === "1");
}

function revalidateUsers() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/users");
}

async function otherActiveAdminCount(excludeId: string) {
  return prisma.user.count({
    where: { id: { not: excludeId }, role: "admin", active: true },
  });
}

async function syncBranches(userId: string, role: AppRole, branchIds: string[]) {
  const unique = [...new Set(branchIds)];
  if (unique.length) {
    const found = await prisma.branch.count({ where: { id: { in: unique } } });
    if (found !== unique.length) throw new Error("סניף לא נמצא");
  }
  if (isBranchScopedRole(role) && unique.length === 0) {
    throw new Error("יש לשייך לפחות סניף אחד למנהל סניף או עובד קצה");
  }
  await prisma.userBranch.deleteMany({ where: { userId } });
  if (unique.length) {
    await prisma.userBranch.createMany({
      data: unique.map((branchId) => ({ userId, branchId })),
    });
  }
}

export async function createUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    await requirePermission("action.manage_users");
    const name = String(formData.get("name") ?? "").trim();
    const username = normalizeUsername(String(formData.get("username") ?? ""));
    const roleRaw = String(formData.get("role") ?? "");
    const requestedPassword = String(formData.get("password") ?? "").trim();
    const branchIds = readBranchIds(formData);
    const active = readActive(formData);

    const nameError = validateDisplayName(name);
    if (nameError) return { error: nameError };
    const usernameError = validateUsername(username);
    if (usernameError) return { error: usernameError };
    if (!isAppRole(roleRaw)) return { error: "יש לבחור תפקיד" };

    const password = requestedPassword || generateTemporaryPassword();
    const passwordError = validatePassword(password);
    if (passwordError) return { error: passwordError };

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return { error: "שם המשתמש כבר תפוס" };

    const user = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash: await hashPassword(password),
        role: roleRaw,
        active,
      },
    });
    await syncBranches(user.id, roleRaw, branchIds);
    revalidateUsers();
    return { credentials: { name, username, password, mode: "created" } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "יצירת המשתמש נכשלה" };
  }
}

export async function updateUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    await requirePermission("action.manage_users");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const username = normalizeUsername(String(formData.get("username") ?? ""));
    const roleRaw = String(formData.get("role") ?? "");
    const branchIds = readBranchIds(formData);
    const active = readActive(formData);

    if (!id) return { error: "משתמש לא נמצא" };
    const nameError = validateDisplayName(name);
    if (nameError) return { error: nameError };
    const usernameError = validateUsername(username);
    if (usernameError) return { error: usernameError };
    const nextRole = parseAppRole(roleRaw);
    if (!nextRole) return { error: "יש לבחור תפקיד" };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { error: "משתמש לא נמצא" };

    const taken = await prisma.user.findFirst({
      where: { username, id: { not: id } },
      select: { id: true },
    });
    if (taken) return { error: "שם המשתמש כבר תפוס" };

    const otherAdmins = await otherActiveAdminCount(id);
    if (
      !canDeactivateOrDemote({
        role: user.role,
        currentlyActive: user.active,
        nextActive: active,
        nextRole,
        otherActiveAdmins: otherAdmins,
      })
    ) {
      return { error: "אי אפשר לבטל או להוריד את האדמין הפעיל האחרון" };
    }

    await prisma.user.update({
      where: { id },
      data: { name, username, role: nextRole, active },
    });
    await syncBranches(id, nextRole, branchIds);
    revalidateUsers();
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "שמירת המשתמש נכשלה" };
  }
}

export async function setUserActive(userId: string, active: boolean): Promise<UserActionState> {
  try {
    await requirePermission("action.manage_users");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "משתמש לא נמצא" };
    const otherAdmins = await otherActiveAdminCount(userId);
    if (
      !canDeactivateOrDemote({
        role: user.role,
        currentlyActive: user.active,
        nextActive: active,
        nextRole: user.role,
        otherActiveAdmins: otherAdmins,
      })
    ) {
      return { error: "אי אפשר לבטל את האדמין הפעיל האחרון" };
    }
    await prisma.user.update({ where: { id: userId }, data: { active } });
    revalidateUsers();
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "עדכון הסטטוס נכשל" };
  }
}

export async function resetUserPassword(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    await requirePermission("action.manage_users");
    const id = String(formData.get("id") ?? "");
    const requestedPassword = String(formData.get("password") ?? "").trim();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { error: "משתמש לא נמצא" };

    const password = requestedPassword || generateTemporaryPassword();
    const passwordError = validatePassword(password);
    if (passwordError) return { error: passwordError };

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });
    revalidateUsers();
    return {
      credentials: { name: user.name, username: user.username, password, mode: "reset" },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "איפוס הסיסמה נכשל" };
  }
}
