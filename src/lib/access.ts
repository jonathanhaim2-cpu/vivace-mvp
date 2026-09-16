import { redirect } from "next/navigation";
import { getAppSession, sessionCan, sessionCanAccessBranch, type AppSession } from "@/lib/session";
import type { PermissionKey } from "@/lib/roles";

export const FORBIDDEN_MESSAGE = "אין הרשאה לפעולה זו";

export async function requireSession() {
  const session = await getAppSession();
  if (session.authEnabled && !session.user) redirect("/login");
  return session;
}

export async function requirePermission(key: PermissionKey) {
  const session = await requireSession();
  if (!sessionCan(session, key)) {
    throw new Error(FORBIDDEN_MESSAGE);
  }
  return session;
}

export async function requireBranchAccess(branchId: string, session?: AppSession) {
  const current = session ?? (await requireSession());
  if (!sessionCanAccessBranch(current, branchId)) {
    throw new Error("אין גישה לסניף זה");
  }
  return current;
}

export async function requirePagePermission(key: PermissionKey | null) {
  const session = await requireSession();
  if (key && !sessionCan(session, key)) redirect("/forbidden");
  return session;
}
