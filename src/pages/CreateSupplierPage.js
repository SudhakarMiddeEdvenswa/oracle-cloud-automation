import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 6–7 — Create Supplier dialog: enter core info, create,
 * and capture the generated Supplier Number.
 */
export class CreateSupplierPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Step 6 — Enter supplier information and click Create.
   * @param {{name:string, taxCountry:string, taxRegistrationNumber:string}} data
   */
  async enterSupplierInfo(data) {
    logger.step(6, 'Enter supplier information');

    // "Create Supplier" opens an inline popup (not a role=dialog). Its fields
    // are uniquely named, so exact-label locators are enough to avoid matching
    // the overview page behind it.
    const nameField = this.page.getByRole('textbox', { name: 'Supplier', exact: true });
    await nameField.waitFor({ state: 'visible' });
    await nameField.fill(data.name);

    // Business Relationship (required) — set if not already defaulted.
    if (data.businessRelationship) {
      await this.oracle
        .selectFromLov('Business Relationship', data.businessRelationship)
        .catch(() => logger.warn('Business Relationship not set; using default'));
    }

    // Tax Organization Type (required native select).
    if (data.taxOrganizationType) {
      await this.oracle
        .selectFromLov('Tax Organization Type', data.taxOrganizationType)
        .catch(() => logger.warn('Tax Organization Type not set; using default'));
    }

    // Tax Registration Number is disabled until a Tax Country is chosen.
    await this.oracle.selectFromLov('Tax Country', data.taxCountry);
    await this.oracle.fillByLabel('Tax Registration Number', data.taxRegistrationNumber);

    logger.step(6, 'Click Create');
    await this.oracle.clickButton('Create', { exact: true });

    // Confirm the "Edit Supplier: <name>" profile page opened (Create succeeded);
    // otherwise surface any validation error from the popup.
    try {
      await this.editSupplierHeading()
        .waitFor({ state: 'visible', timeout: 30000 });
    } catch {
      const messages = await this.page
        .getByText(/already exists|required|must|invalid|enter a|cannot|can't|ZX-\d+/i)
        .allTextContents()
        .catch(() => []);
      const detail = messages.map((m) => m.trim()).filter(Boolean).join(' | ');
      throw new Error(
        `Create Supplier did not complete (popup still open). Validation: ${detail || 'unknown'}`
      );
    }
    await this.waitUntilReady();
    logger.pass('Supplier created; Supplier Profile page opened');
  }

  /** Locator for the "Edit Supplier: <name>" profile page heading. */
  editSupplierHeading() {
    return this.page.getByRole('heading', { name: /^Edit Supplier:/i }).first();
  }

  /**
   * Step 7 — Capture the auto-generated Supplier Number.
   * @returns {Promise<string>} SUPPLIER_NUMBER
   */
  async captureSupplierNumber() {
    logger.step(7, 'Capture Supplier Number');

    // The Supplier Number is a read-only output rendered inline with its label,
    // e.g. "Supplier Number 2026000285 Alternate Name". Match the run and
    // extract the digits that follow the label.
    const numberRun = this.page.getByText(/Supplier Number\s*\d+/i).first();
    await numberRun.waitFor({ state: 'visible', timeout: 30000 });
    const raw = (await numberRun.textContent().catch(() => '')) || '';
    const match = raw.match(/Supplier Number\s*(\d+)/i);
    const supplierNumber = (match ? match[1] : '').trim();

    expect(supplierNumber, 'Supplier Number should be present').not.toEqual('');
    logger.pass(`SUPPLIER_NUMBER captured: ${supplierNumber}`);
    return supplierNumber;
  }
}
