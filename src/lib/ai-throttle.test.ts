import assert from "node:assert/strict";
import test from "node:test";
import { AI_QUOTA_MESSAGE, aiFailureReason, isRateLimitError, withRateLimitRetry } from "./ai-throttle";

test("isRateLimitError detects Gemini 429 and RESOURCE_EXHAUSTED", () => {
  assert.equal(isRateLimitError(new Error("Gemini 429: RESOURCE_EXHAUSTED")), true);
  assert.equal(isRateLimitError(new Error("quota exceeded")), true);
  assert.equal(isRateLimitError(new Error("Gemini 500: boom")), false);
});

test("aiFailureReason returns the Hebrew quota copy only for 429", () => {
  assert.equal(aiFailureReason(new Error("Gemini 429: rate limit")), AI_QUOTA_MESSAGE);
  assert.equal(aiFailureReason(new Error("parse failed")), null);
});

test("withRateLimitRetry retries 429 then succeeds", async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await withRateLimitRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("Gemini 429: RESOURCE_EXHAUSTED");
      return "ok";
    },
    3,
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(waits, [4000, 8000]);
});
