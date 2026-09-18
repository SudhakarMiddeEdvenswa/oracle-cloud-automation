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
