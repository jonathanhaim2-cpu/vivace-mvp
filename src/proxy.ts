import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthEnabled, isValidSessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-vivace-path", pathname);

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt";

  if (!isAuthEnabled() || isPublic) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (isValidSessionToken(token)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
