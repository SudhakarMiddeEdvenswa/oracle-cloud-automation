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
    // A distinguishing grid columnheader per tab confirms the content swapped in
    // (the tab strip switches asynchronously and can race the next assertion).
    const markers = {
      Addresses: 'Address Name',
      Sites: 'Procurement BU',
      Contacts: 'Administrative Contact',
    };
    const tab = this.page
      .getByRole('tab', { name: tabName, exact: false })
      .or(this.page.getByRole('link', { name: new RegExp(`^${tabName}$`, 'i') }))
      .first();
    await tab.waitFor({ state: 'visible' });
    await tab.click();
    await this.waitUntilReady();

    const marker = markers[tabName];
    if (marker) {
      const found = this.page.getByRole('columnheader', { name: marker, exact: false }).first();
      if (!(await found.isVisible({ timeout: 5000 }).catch(() => false))) {
        // Retry the tab click once if the panel didn't swap in.
        await tab.click();
        await this.waitUntilReady();
        await found.waitFor({ state: 'visible', timeout: 30000 });
      }
    }
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

  /** Step 19 — Save all pending changes and close the supplier. */
  async saveAll() {
    logger.step(19, 'Save the complete supplier');
    // Prefer "Save and Close" (exact) so we exit the editor and land back on the
    // Suppliers work area, ready for the step-20 search.
    const saveAndClose = this.page.getByRole('button', { name: 'Save and Close', exact: true }).first();
    if (await saveAndClose.isVisible().catch(() => false)) {
      await saveAndClose.click();
    } else {
      await this.saveIfPossible(/^Save$/i);
    }
    await this.waitUntilReady();
    await this.oracle.dismissConfirmation();

    // No validation-error banner should be present.
    const errorBanner = this.page.getByText(/\berror\b/i).first();
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
    const field = this.page.getByLabel(label, { exact: true }).first();
    await field.waitFor({ state: 'visible', timeout: 30000 });
    const actual =
      (await field.inputValue().catch(() => null)) ??
      (await field.textContent().catch(() => '')) ??
      '';
    // Oracle may render values in a different case (e.g. "SERVICES"); compare
    // case-insensitively.
    expect(actual.trim().toLowerCase(), `Field "${label}"`).toContain(expected.toLowerCase());
    logger.pass(`Validated ${label} = "${expected}"`);
  }

  /**
   * Step 21 — assert the Supplier Number output (rendered inline with its label)
   * matches the captured value.
   * @param {string} expected
   */
  async validateSupplierNumber(expected) {
    const run = this.page.getByText(new RegExp(`Supplier Number\\s*${expected}`, 'i')).first();
    await expect(run).toBeVisible({ timeout: 30000 });
    logger.pass(`Validated Supplier Number = "${expected}"`);
  }

  /** Step 21 — assert the Edit Supplier heading carries the supplier name. */
  async validateSupplierName(expected) {
    const heading = this.page.getByRole('heading', { name: new RegExp(`Edit Supplier:.*${expected}`, 'i') }).first();
    await expect(heading).toBeVisible({ timeout: 30000 });
    logger.pass(`Validated Supplier Name = "${expected}"`);
  }
}
