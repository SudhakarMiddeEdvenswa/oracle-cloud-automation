import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Supplier Profile shell — tab navigation (Profile, Addresses, Sites,
 * Contacts) plus steps 8 (organization details) and 19 (final save).
 */
export class SupplierProfilePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Open a supplier-profile tab by its visible name.
   * @param {string} tabName - Profile | Addresses | Sites | Contacts
   */
  async openTab(tabName) {
    logger.info(`Open supplier tab "${tabName}"`);
    const tab = this.page
      .getByRole('tab', { name: tabName, exact: false })
      .or(this.page.getByRole('link', { name: new RegExp(`^${tabName}$`, 'i') }))
      .first();
    await tab.waitFor({ state: 'visible' });
    await tab.click();
    await this.waitUntilReady();
  }

  /**
   * Step 8 — Validate / set organization details (Supplier Type).
   * @param {string} supplierType
   */
  async setSupplierType(supplierType) {
    logger.step(8, `Set Supplier Type = "${supplierType}"`);
    await this.openTab('Profile');
    await this.oracle.selectFromLov('Supplier Type', supplierType);
    await this.saveIfPossible();
    logger.pass('Supplier profile (organization details) saved');
  }

  /** Step 19 — Save all pending changes on the supplier profile. */
  async saveAll() {
    logger.step(19, 'Save the complete supplier');
    await this.saveIfPossible(/Save and Close|Save/i);
    // No validation-error banner should be present.
    const errorBanner = this.page.getByText(/error/i).first();
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent();
      throw new Error(`Validation error while saving supplier: ${text}`);
    }
    logger.pass('Supplier saved with no validation errors');
  }

  /**
   * Click a Save button if one is present (many Oracle subforms autosave).
   * @param {RegExp} [pattern]
   */
  async saveIfPossible(pattern = /^Save$/i) {
    const saveBtn = this.page.getByRole('button', { name: pattern }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await this.waitUntilReady();
    }
  }

  /**
   * Step 21 — assert a labelled field shows the expected value.
   * @param {string} label
   * @param {string} expected
   */
  async validateField(label, expected) {
    const field = this.page.getByLabel(label, { exact: false }).first();
    const actual =
      (await field.inputValue().catch(() => null)) ??
      (await field.textContent().catch(() => '')) ??
      '';
    expect(actual.trim(), `Field "${label}"`).toContain(expected);
    logger.pass(`Validated ${label} = "${expected}"`);
  }
}
