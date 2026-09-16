"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, createSessionToken, isAuthEnabled } from "@/lib/auth";
import { parseAppRole } from "@/lib/roles";
import { normalizeUsername, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/") || "/";
  const next = from.startsWith("/") && !from.startsWith("//") ? from : "/";

  if (!isAuthEnabled()) {
    redirect(next);
  }

  function fail(code: "1" | "inactive"): never {
    redirect(`/login?error=${code}&from=${encodeURIComponent(next)}`);
  }

  if (!username || !password) fail("1");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) fail("1");
  const role = parseAppRole(user.role);
  if (!role) fail("1");
  if (!user.active) fail("inactive");
  if (!(await verifyPassword(password, user.passwordHash))) fail("1");

  const jar = await cookies();
  jar.set(AUTH_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const assigned = await prisma.userBranch.findMany({
    where: { userId: user.id },
    select: { branchId: true },
  });
  if (assigned.length === 1) {
    jar.set("vivace-branch", assigned[0].branchId, { path: "/" });
  }

  redirect(next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}
