"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, isAuthEnabled, passwordMatches, sessionToken } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/") || "/";

  if (!isAuthEnabled()) {
    redirect(from.startsWith("/") ? from : "/");
  }

  if (!passwordMatches(password)) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}
