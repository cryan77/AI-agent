const REGION_PATTERN = /region|not available in your region/i;
const RATE_LIMIT_PATTERN = /rate limit|too many requests|429/i;
const CONNECTION_PATTERN = /could not reach|connection|network|timed out|timeout/i;

export function toChatErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const text = raw.toLowerCase();

  if (REGION_PATTERN.test(raw) || (text.includes("403") && text.includes("not available"))) {
    return (
      "The refund assistant is not available in your region right now. " +
      "Please contact customer support for help with your refund."
    );
  }
  if (RATE_LIMIT_PATTERN.test(text)) {
    return "The assistant is busy right now. Please wait a moment and try again.";
  }
  if (CONNECTION_PATTERN.test(text)) {
    return (
      "We could not reach the refund assistant service. " +
      "Please check your connection and try again in a few minutes."
    );
  }
  if (text.includes("error code:") || text.includes("'error':") || text.startsWith("error:")) {
    return (
      "The refund assistant is temporarily unavailable. " +
      "Please try again later or contact customer support."
    );
  }

  return raw.replace(/^Error:\s*/i, "").trim() || "Something went wrong. Please try again.";
}
