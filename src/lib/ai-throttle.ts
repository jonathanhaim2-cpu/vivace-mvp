export const AI_QUOTA_MESSAGE = "חריגת מכסת AI — נסו שוב בעוד דקה או נתחו אחד־אחד";
export const IMPORT_ANALYZE_GAP_MS = 4500;

export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b/.test(message) || /resource.?exhausted|quota|rate.?limit/i.test(message);
}

export function aiFailureReason(error: unknown): string | null {
  return isRateLimitError(error) ? AI_QUOTA_MESSAGE : null;
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === attempts - 1) {
        throw error;
      }
      await wait(4000 * (attempt + 1));
    }
  }
  throw lastError;
}
