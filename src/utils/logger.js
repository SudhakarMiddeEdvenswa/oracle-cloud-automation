/**
 * Minimal timestamped console logger shared across the framework.
 * Kept dependency-free so it works in any Playwright runtime.
 */

function stamp() {
  // Locale time is enough for step-by-step run tracing.
  return new Date().toISOString();
}

/**
 * Optional destination for log lines.
 *
 * The platform sets this per row so the page objects' existing logging shows up
 * in the live UI stream and the run report, without every page object having to
 * know the platform exists. Rows execute sequentially, so a single sink is safe.
 *
 * While a sink is attached it *replaces* the console: the platform owns the
 * output and would otherwise print every line twice. With no sink (a plain
 * `playwright test` run) the console behaviour is unchanged.
 * @type {null | ((level:string, message:string)=>void)}
 */
let sink = null;

/**
 * Route one line to the sink, or to the console when there is none.
 * @param {string} level
 * @param {string} message
 * @param {(text:string)=>void} write - the console writer for this level
 * @param {string} text - the console-formatted line
 */
function emit(level, message, write, text) {
  if (!sink) {
    write(text);
    return;
  }
  try {
    sink(level, message);
  } catch {
    // A broken sink must never break a test run; fall back to the console.
    write(text);
  }
}

export const logger = {
  /**
   * Route log lines to an additional destination (the platform's run stream).
   * @param {null | ((level:string, message:string)=>void)} fn
   */
  setSink(fn) {
    sink = typeof fn === 'function' ? fn : null;
  },

  /** Informational progress message. */
  info(message) {
    emit('info', message, console.log, `[INFO ] ${stamp()} ${message}`);
  },
  /** Test step marker (used to trace the 21 execution steps). */
  step(number, message) {
    emit('step', `(${number}) ${message}`, console.log, `[STEP ] ${stamp()} (${number}) ${message}`);
  },
  /** Non-fatal warning. */
  warn(message) {
    emit('warn', message, console.warn, `[WARN ] ${stamp()} ${message}`);
  },
  /** Error message. */
  error(message) {
    emit('error', message, console.error, `[ERROR] ${stamp()} ${message}`);
  },
  /** Successful validation checkpoint. */
  pass(message) {
    emit('pass', message, console.log, `[PASS ] ${stamp()} ${message}`);
  },
};
