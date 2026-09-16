import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const USERNAME_RE = /^[a-z0-9._-]+$/;
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string) {
  if (username.length < 2 || username.length > 32) {
    return "שם משתמש חייב להיות בין 2 ל-32 תווים";
  }
  if (!USERNAME_RE.test(username)) {
    return "שם משתמש באנגלית: אותיות, ספרות, נקודה, מקף או קו תחתון";
  }
  return null;
}

export function validateDisplayName(name: string) {
  if (name.trim().length < 2) return "יש למלא שם תצוגה";
  if (name.trim().length > 80) return "שם התצוגה ארוך מדי";
  return null;
}

export function validatePassword(password: string) {
  if (password.length < 8) return "הסיסמה חייבת לפחות 8 תווים";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "הסיסמה חייבת לכלול לפחות אות אחת ומספר אחד";
  }
  return null;
}

export function generateTemporaryPassword(length = 10) {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }
  if (!/[A-Za-z]/.test(password)) password = `A${password.slice(1)}`;
  if (!/[0-9]/.test(password)) password = `${password.slice(0, -1)}7`;
  return password;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
