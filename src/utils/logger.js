/**
 * Minimal timestamped console logger shared across the framework.
 * Kept dependency-free so it works in any Playwright runtime.
 */

function stamp() {
  // Locale time is enough for step-by-step run tracing.
  return new Date().toISOString();
}

export const logger = {
  /** Informational progress message. */
  info(message) {
    console.log(`[INFO ] ${stamp()} ${message}`);
  },
  /** Test step marker (used to trace the 21 execution steps). */
  step(number, message) {
    console.log(`[STEP ] ${stamp()} (${number}) ${message}`);
  },
  /** Non-fatal warning. */
  warn(message) {
    console.warn(`[WARN ] ${stamp()} ${message}`);
  },
  /** Error message. */
  error(message) {
    console.error(`[ERROR] ${stamp()} ${message}`);
  },
  /** Successful validation checkpoint. */
  pass(message) {
    console.log(`[PASS ] ${stamp()} ${message}`);
  },
};
