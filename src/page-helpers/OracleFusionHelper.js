import { expect } from '@playwright/test';
import { logger } from '../utils/logger.js';

/**
 * Oracle Fusion / Cloud SaaS specific interaction helper.
 *
 * Oracle's ADF / Oracle JET UI has quirks (LOV dropdowns, "Search..." choice
 * lists, deferred rendering, blocking glass panes). This helper centralizes the
 * workarounds so page objects stay readable and label-driven.
 */
export class OracleFusionHelper {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for Oracle's loading indicators / glass pane to clear so the next
   * action does not race a spinner.
   */
  async waitForLoading() {
    // Oracle renders a blocking glass pane (af_document_glasspane) during work.
    const glassPane = this.page.locator('.AFBlockingGlassPane, [id$="glasspane"]');
    try {
      await glassPane.first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // No glass pane appeared (or it never resolved as a distinct node) — fine.
    }
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Wait out the Redwood Procurement page-loading indicator, which overlays the
   * header and intercepts clicks (e.g. the Cart tab) while content settles.
   * Best-effort: resolves immediately when the indicator is not showing.
   */
  async waitForProcurementIndicator() {
    const spinner = this.page.locator(
      '.oj-fa-procurement-page-loading-indicator-container .oj-progress-circle, ' +
        '.oj-fa-procurement-page-loading-indicator-container [role="progressbar"]'
    );
    await spinner.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  /**
   * Fill an input identified by its visible label text.
   * @param {string} label
   * @param {string} value
   * @param {{exact?: boolean, root?: import('@playwright/test').Locator}} [opts]
   *   root scopes the lookup (e.g. to a dialog); exact avoids greedy matches
   *   like "Supplier" also hitting "Supplier Type".
   */
  async fillByLabel(label, value, opts = {}) {
    const { exact = true, root = this.page } = opts;
    logger.info(`Fill "${label}" = "${value}"`);
    const field = root.getByLabel(label, { exact }).first();
    await field.waitFor({ state: 'visible' });
    await field.fill('');
    await field.fill(value);
  }

  /**
   * Click a button identified by its visible name/text.
   * @param {string} name
   */
  async clickButton(name, opts = {}) {
    const { exact = false, root = this.page } = opts;
    logger.info(`Click button "${name}"`);
    const button = root.getByRole('button', { name, exact }).first();
    await button.waitFor({ state: 'visible' });
    await button.click();
    await this.waitForLoading();
  }

  /**
   * Click a link / navigation entry identified by its visible text.
   * @param {string} name
   * @param {{force?: boolean, exact?: boolean}} [opts] - force bypasses the
   *   sticky-header interception seen in the Fusion Navigator menu.
   */
  async clickLink(name, opts = {}) {
    const { force = false, exact = false } = opts;
    logger.info(`Click link "${name}"`);
    const link = this.page.getByRole('link', { name, exact }).first();
    await link.waitFor({ state: 'visible' });
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await link.click({ force });
    await this.waitForLoading();
  }

  /**
   * Select a value from an Oracle LOV / choice-list (combobox) by label.
   * Handles both native <select> and Oracle's search-enabled dropdowns.
   * @param {string} label
   * @param {string} value
   */
  async selectFromLov(label, value, opts = {}) {
    const { exact = true, root = this.page } = opts;
    logger.info(`Select "${value}" for "${label}"`);
    const control = root.getByLabel(label, { exact }).first();
    await control.waitFor({ state: 'visible' });

    const tagName = await control.evaluate((el) => el.tagName.toLowerCase());

    // Case 1: native <select> — select directly by visible label.
    if (tagName === 'select') {
      // Fail fast (instead of a 60s wait) if the option isn't present.
      const options = await control.evaluate((el) =>
        Array.from(el.options).map((o) => o.label || o.text)
      );
      const found = options.some((o) => (o || '').trim() === value.trim());
      if (!found) {
        throw new Error(`Option "${value}" not available (choices: ${options.join(', ')})`);
      }
      await control.selectOption({ label: value });
      await this.waitForLoading();
      return;
    }

    // Case 2/3: editable combobox / input LOV. Type the value first.
    await control.click();
    await control.fill('');
    await control.type(value, { delay: 20 });

    // Case 2: a suggestion listbox (role=option) appears — click the match.
    const option = this.page.getByRole('option', { name: value, exact: false }).first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
      await this.waitForLoading();
      return;
    }

    // Case 3: Oracle "Autocompletes on TAB" combobox — commit with Tab.
    await control.press('Tab');
    await this.waitForLoading();
  }

  /**
   * Select a value from a Redwood (Oracle JET) single-select combobox by label.
   *
   * These are neither native <select> nor classic ADF LOVs: the control is an
   * <input role="combobox"> overlaid by an <oj-label> that intercepts clicks,
   * and its dropdown is an oj-list-view rendered as role="grid" whose choices are
   * role="row" / role="gridcell" (NOT role="option"). So: force-click to open,
   * type to filter the async list, then click the matching row.
   *
   * @param {string} label
   * @param {string} value
   * @param {{exact?:boolean, allowFirstFallback?:boolean, root?:import('@playwright/test').Locator}} [opts]
   *   allowFirstFallback: when the requested value is not offered, pick the first
   *   available row instead of failing (and log the choices seen).
   * @returns {Promise<string>} the row text actually selected
   */
  async selectRedwoodCombobox(label, value, opts = {}) {
    const { exact = false, allowFirstFallback = false, root = this.page } = opts;
    logger.info(`Select "${value}" for combobox "${label}"`);

    const combo = root.getByRole('combobox', { name: label, exact }).first();
    await combo.waitFor({ state: 'visible' });
    await combo.scrollIntoViewIfNeeded().catch(() => {});

    // The oj-label overlays the input and intercepts pointer events, so a plain
    // click times out — force it to open the dropdown.
    await combo.click({ force: true });
    await combo.fill('').catch(() => {});
    // Real key events drive the async, filtered LOV (aria-autocomplete=list).
    await combo.pressSequentially(String(value), { delay: 40 });

    // Scope the result rows to this combobox's own dropdown (aria-controls) so we
    // never match rows from another grid on the page.
    const dropdownId = await combo.getAttribute('aria-controls').catch(() => null);
    const scope = dropdownId ? this.page.locator(`#${cssEscape(dropdownId)}`) : this.page;

    // Let any "Loading…" indicator resolve, then wait for rows to render.
    await this.page
      .getByText(/^Loading/i)
      .first()
      .waitFor({ state: 'hidden', timeout: 8000 })
      .catch(() => {});
    await scope
      .getByRole('row')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => {});

    // A row whose accessible name contains the value (JET repeats code + name,
    // e.g. "615.00 Office Supplies Office Supplies").
    const match = scope.getByRole('row', { name: new RegExp(escapeRegExp(value), 'i') }).first();
    if (await match.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = (await match.textContent())?.trim() || value;
      await match.click();
      await this.waitForLoading();
      return text;
    }

    const rows = scope.getByRole('row');
    const count = await rows.count().catch(() => 0);
    if (allowFirstFallback && count > 0) {
      const first = rows.first();
      const text = (await first.textContent())?.trim() || '';
      const available = (await rows.allTextContents().catch(() => []))
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 15);
      logger.warn(`"${value}" not offered for "${label}"; choosing "${text}". Available: ${available.join(' | ')}`);
      await first.click();
      await this.waitForLoading();
      return text;
    }

    // Close the open list before surfacing the error.
    await this.page.keyboard.press('Escape').catch(() => {});
    throw new Error(`"${value}" not available for "${label}" (${count} rows offered).`);
  }

  /**
   * Toggle a checkbox identified by its visible label to the desired state.
   * @param {string} label
   * @param {boolean} checked
   */
  async setCheckbox(label, checked, opts = {}) {
    const { root = this.page } = opts;
    logger.info(`Set checkbox "${label}" -> ${checked}`);
    const box = root
      .getByRole('checkbox', { name: label, exact: false })
      .or(root.getByLabel(label, { exact: false }))
      .first();
    await box.waitFor({ state: 'attached' });

    // Already in the desired state? Nothing to do.
    if ((await box.isChecked().catch(() => false)) === checked) return;

    // Oracle renders the real <input> hidden/0-sized; the adjacent text label
    // is the actual click target. Prefer clicking that, then fall back to a
    // forced check on the input.
    const clickableLabel = root.getByText(label, { exact: true }).first();
    if (await clickableLabel.isVisible().catch(() => false)) {
      await clickableLabel.click();
    } else {
      await box.setChecked(checked, { force: true });
    }

    // Verify the state took effect.
    const finalState = await box.isChecked().catch(() => null);
    if (finalState !== null && finalState !== checked) {
      await box.setChecked(checked, { force: true }).catch(() => {});
    }
    await this.waitForLoading();
  }

  /**
   * Dismiss an Oracle "Confirmation / Your changes were saved" popup if one is
   * showing, so it doesn't intercept the next click.
   */
  async dismissConfirmation() {
    const ok = this.page.getByRole('button', { name: /^(OK|Close)$/i }).first();
    if (await ok.isVisible().catch(() => false)) {
      await ok.click().catch(() => {});
      await this.waitForLoading();
      return;
    }
    const closeLink = this.page.getByRole('link', { name: /^Close$/i }).first();
    if (await closeLink.isVisible().catch(() => false)) {
      await closeLink.click().catch(() => {});
    }
  }

  /**
   * Assert that visible text appears somewhere on the page.
   * @param {string} text
   */
  async expectText(text) {
    await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
  }

  /**
   * Read the trimmed text content of the first element matching a selector.
   * @param {string} selector
   * @returns {Promise<string>}
   */
  async readText(selector) {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: 'visible' });
    return (await el.textContent())?.trim() ?? '';
  }

  /**
   * Capture a full-page screenshot to the screenshots directory as evidence.
   * @param {string} name
   * @returns {Promise<string>} path to the saved screenshot
   */
  async screenshot(name) {
    const safe = name.replace(/[^a-z0-9-_]+/gi, '_');
    const filePath = `screenshots/${safe}.png`;
    await this.page.screenshot({ path: filePath, fullPage: true });
    logger.info(`Screenshot saved: ${filePath}`);
    return filePath;
  }
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Escape a string for use as a CSS #id selector (ids can contain "|", ".", etc.). */
function cssEscape(id) {
  return String(id).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}
