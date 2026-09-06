import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "vivace-gate";

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

export function sessionToken() {
  const secret = signingSecrets()[0];
  if (!secret) return "";
  return createHmac("sha256", secret).update("vivace-session-v1").digest("hex");
}

export function isValidSessionToken(token: string | undefined) {
  if (!token || !isAuthEnabled()) return !isAuthEnabled();
  return signingSecrets().some((secret) => {
    const expected = createHmac("sha256", secret).update("vivace-session-v1").digest("hex");
    if (expected.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  });
}

export function passwordMatches(password: string) {
  return configuredPasswords().some((expected) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  });
}
