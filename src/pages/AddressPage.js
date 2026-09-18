import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 9–11 — Supplier Addresses: create address, set purposes, save.
 */
export class AddressPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /** Step 9 — Open Addresses tab and start a new address. */
  async startCreateAddress() {
    logger.step(9, 'Navigate to Addresses and click Create');
    const createBtn = this.page
      .getByRole('button', { name: /^(Create|Add|Actions)$/i })
      .first();
    await createBtn.waitFor({ state: 'visible' });
    await createBtn.click();
    await this.waitUntilReady();
    logger.pass('Create Address form displayed');
  }

  /**
   * Step 10 — Enter address details.
   * @param {object} address
   */
  async enterAddress(address) {
    logger.step(10, 'Enter supplier address');
    await this.oracle.fillByLabel('Address Name', address.addressName);
    await this.oracle.selectFromLov('Country', address.country);
    await this.oracle.fillByLabel('Address Line 1', address.addressLine1);
    // City is an autocomplete combobox ("City or Town"); State is a plain
    // textbox; Postal Code is labelled "Pin Code" for India.
    await this.oracle.selectFromLov('City or Town', address.city);
    await this.oracle.fillByLabel('State', address.state);
    await this.oracle.fillByLabel('Pin Code', address.postalCode);
    logger.pass('Address information entered without validation errors');
  }

  /**
   * Step 11 — Configure address purposes and save.
   * @param {string[]} purposes - checkbox labels to enable (e.g. Ordering, Remit to)
   */
  async setPurposesAndSave(purposes) {
    logger.step(11, 'Configure address purpose');
    for (const purpose of purposes) {
      await this.oracle.setCheckbox(purpose, true);
    }

    await this.oracle.clickButton('Save and Close');
    logger.pass('Address saved');
  }

  /**
   * Verify an address appears in the supplier address list.
   * @param {string} addressName
   */
  async expectAddressListed(addressName) {
    await expect(this.page.getByText(addressName, { exact: false }).first()).toBeVisible();
    logger.pass(`Address "${addressName}" listed`);
  }
}
