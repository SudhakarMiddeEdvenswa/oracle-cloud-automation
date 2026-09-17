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
    const nameFieldStillOpen = this.page.getByRole('textbox', { name: 'Supplier', exact: true });
    await this.oracle.clickButton('Create', { exact: true });

    // Confirm the popup actually closed; otherwise surface any validation error.
    try {
      await nameFieldStillOpen.waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      const errorText = await this.page
        .getByText(/error|required|must|invalid/i)
        .first()
        .textContent()
        .catch(() => '');
      throw new Error(`Create Supplier did not complete. Popup still open. ${errorText || ''}`.trim());
    }
    await this.waitUntilReady();
    logger.pass('Supplier created; Supplier Profile page opened');
  }

  /**
   * Step 7 — Capture the auto-generated Supplier Number.
   * @returns {Promise<string>} SUPPLIER_NUMBER
   */
  async captureSupplierNumber() {
    logger.step(7, 'Capture Supplier Number');
    // Oracle renders the supplier number as a read-only output beside its label.
    const numberField = this.page
      .getByLabel('Supplier Number', { exact: false })
      .first();

    let supplierNumber = '';
    if (await numberField.isVisible().catch(() => false)) {
      supplierNumber =
        (await numberField.inputValue().catch(() => '')) ||
        (await numberField.textContent().catch(() => '')) ||
        '';
    }

    // Fallback: read the output text node following the "Supplier Number" label.
    if (!supplierNumber) {
      supplierNumber = await this.oracle
        .readText('xpath=//label[contains(.,"Supplier Number")]/following::*[normalize-space()][1]')
        .catch(() => '');
    }

    supplierNumber = supplierNumber.trim();
    expect(supplierNumber, 'Supplier Number should be present').not.toEqual('');
    logger.pass(`SUPPLIER_NUMBER captured: ${supplierNumber}`);
    return supplierNumber;
  }
}
