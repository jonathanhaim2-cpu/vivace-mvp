import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "vivace-gate";
const TOKEN_PREFIX = "v2";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function configuredPasswords() {
  return [process.env.APP_PASSWORD, process.env.APP_PASSWORD_ROI]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function isAuthEnabled() {
  return configuredPasswords().length > 0;
}

function signingSecrets() {
  const extra = process.env.AUTH_SECRET?.trim();
  return [extra, ...configuredPasswords()].filter((value): value is string => Boolean(value));
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`vivace-user-v2:${payload}`).digest("hex");
}

function signaturesMatch(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(userId: string) {
  const secret = signingSecrets()[0];
  if (!secret) return "";
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${TOKEN_PREFIX}.${userId}.${exp}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

export function parseSessionToken(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_PREFIX) return null;
  const [prefix, userId, expRaw, signature] = parts;
  if (!userId || !/^[a-z0-9_-]+$/i.test(userId)) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const payload = `${prefix}.${userId}.${expRaw}`;
  const ok = signingSecrets().some((secret) => signaturesMatch(signature, signPayload(payload, secret)));
  return ok ? { userId } : null;
}

export function isValidSessionToken(token: string | undefined) {
  if (!isAuthEnabled()) return true;
  return parseSessionToken(token) !== null;
}

/** @deprecated Shared-password login was replaced by per-user sessions. */
export function sessionToken() {
  return createSessionToken("legacy");
}

export function passwordMatches(password: string) {
  return configuredPasswords().some((expected) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  });
}
