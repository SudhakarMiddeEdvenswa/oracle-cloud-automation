import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 17–18 — Supplier Contacts: create and save a contact.
 */
export class ContactPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /** Step 17 — Open Contacts tab and start a new contact. */
  async startCreateContact() {
    logger.step(17, 'Navigate to Contacts and click Create');
    const createBtn = this.page
      .getByRole('button', { name: /^(Create|Add|Actions)$/i })
      .first();
    await createBtn.waitFor({ state: 'visible' });
    await createBtn.click();
    await this.waitUntilReady();
    logger.pass('Create Contact form displayed');
  }

  /**
   * Step 18 — Enter contact details and save.
   * @param {object} contact
   * @param {string} [addressName] - associate contact with this address if possible
   */
  async createContact(contact, addressName) {
    logger.step(18, 'Create supplier contact');
    await this.oracle.fillByLabel('First Name', contact.firstName);
    await this.oracle.fillByLabel('Last Name', contact.lastName);
    await this.oracle.fillByLabel('Email', contact.email);

    if (contact.administrativeContact) {
      await this.oracle
        .setCheckbox('Administrative contact', true)
        .catch(() => logger.warn('Administrative contact option not available'));
    }

    if (addressName) {
      await this.oracle
        .setCheckbox(addressName, true)
        .catch(() => logger.warn(`Could not associate contact with "${addressName}"`));
    }

    await this.oracle.clickButton('Save and Close');
    logger.pass('Contact saved');
  }

  /**
   * Verify a contact appears in the Contacts list.
   * @param {string} fullName
   */
  async expectContactListed(fullName) {
    await expect(this.page.getByText(fullName, { exact: false }).first()).toBeVisible();
    logger.pass(`Contact "${fullName}" listed`);
  }
}
