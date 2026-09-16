import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, isAuthEnabled, parseSessionToken } from "@/lib/auth";
import {
  type AppRole,
  type PermissionKey,
  isNetworkRole,
  parseAppRole,
  resolveRolePermissions,
} from "@/lib/roles";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: AppRole;
  active: boolean;
};

export type SessionBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  contactName: string | null;
};

export type AppSession = {
  user: SessionUser | null;
  appRole: AppRole | null;
  role: Role;
  isNetwork: boolean;
  branchId: string | null;
  branch: SessionBranch | null;
  branches: SessionBranch[];
  permissions: PermissionKey[];
  authEnabled: boolean;
};

const DEV_USER: SessionUser = {
  id: "local-dev",
  name: "פיתוח מקומי",
  username: "dev",
  role: "admin",
  active: true,
};

function canFactory(permissions: PermissionKey[]) {
  const set = new Set(permissions);
  return (key: PermissionKey | string) => set.has(key as PermissionKey);
}

async function loadPermissionKeys(role: AppRole) {
  const rows = await prisma.rolePermission.findMany({ where: { role } });
  return [...resolveRolePermissions(role, rows)];
}

async function buildSession(user: SessionUser | null): Promise<AppSession> {
  const authEnabled = isAuthEnabled();
  const appRole = user?.role ?? null;
  const isNetwork = isNetworkRole(appRole);
  const viewRole: Role = isNetwork ? "network" : "branch";
  const allBranches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  let assignedIds: string[] | null = null;
  if (user && !isNetwork && user.id !== DEV_USER.id) {
    const links = await prisma.userBranch.findMany({
      where: { userId: user.id },
      select: { branchId: true },
    });
    assignedIds = links.map((link) => link.branchId);
  }

  const branches = assignedIds
    ? allBranches.filter((branch) => assignedIds.includes(branch.id))
    : allBranches;

  const jar = await cookies();
  const requested = jar.get("vivace-branch")?.value;
  const branch = branches.find((item) => item.id === requested) ?? branches[0] ?? null;
  const permissions = appRole ? await loadPermissionKeys(appRole) : [];

  return {
    user,
    appRole,
    role: viewRole,
    isNetwork,
    branchId: branch?.id ?? null,
    branch,
    branches,
    permissions,
    authEnabled,
  };
}

export const getAppSession = cache(async (): Promise<AppSession> => {
  if (!isAuthEnabled()) {
    return buildSession(DEV_USER);
  }

  const jar = await cookies();
  const parsed = parseSessionToken(jar.get(AUTH_COOKIE)?.value);
  if (!parsed) return buildSession(null);

  const row = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, name: true, username: true, role: true, active: true },
  });
  const role = parseAppRole(row?.role);
  if (!row || !row.active || !role) return buildSession(null);

  return buildSession({
    id: row.id,
    name: row.name,
    username: row.username,
    role,
    active: row.active,
  });
});

export function sessionCan(session: AppSession, key: PermissionKey | string) {
  return canFactory(session.permissions)(key);
}

export function sessionCanAccessBranch(session: AppSession, branchId: string | null | undefined) {
  if (!branchId) return false;
  if (session.isNetwork) return true;
  return session.branches.some((branch) => branch.id === branchId);
}
