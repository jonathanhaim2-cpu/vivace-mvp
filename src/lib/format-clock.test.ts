import assert from "node:assert/strict";
import test from "node:test";
import { formatClockTime, normalizeClockTime, parseCutoffMinutes } from "./format";

test("normalizeClockTime keeps 14:00 as 14:00", () => {
  assert.equal(normalizeClockTime("14:00"), "14:00");
  assert.equal(normalizeClockTime("9:05"), "09:05");
  assert.equal(normalizeClockTime("14.00"), "14:00");
});

test("formatClockTime wraps HH:MM with LTR marks so RTL does not reverse it", () => {
  const formatted = formatClockTime("14:00");
  assert.equal(formatted, "\u200E14:00\u200E");
  assert.ok(formatted.includes("14:00"));
  assert.ok(!formatted.includes("00:14"));
});

test("parseCutoffMinutes reads 14:00 as 840 minutes, not 14", () => {
  assert.equal(parseCutoffMinutes("14:00"), 14 * 60);
  assert.equal(parseCutoffMinutes("00:14"), 14);
});
