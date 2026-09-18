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
    // Clear any leftover save confirmation, then make sure the Contacts grid is
    // loaded before clicking Create (avoids racing the tab swap).
    await this.oracle.dismissConfirmation();
    await this.page
      .getByRole('columnheader', { name: 'Name', exact: true })
      .first()
      .waitFor({ state: 'visible' });

    await this.page.getByRole('button', { name: 'Create', exact: true }).first().click();
    // The Create Contact page renders asynchronously; wait for its heading.
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page
      .getByRole('heading', { name: /^Create Contact$/i })
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });
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
      // Optional association; only attempt if a matching checkbox is present.
      const addrBox = this.page.getByRole('checkbox', { name: addressName, exact: false }).first();
      if (await addrBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.oracle
          .setCheckbox(addressName, true)
          .catch(() => logger.warn(`Could not associate contact with "${addressName}"`));
      } else {
        logger.warn(`Address "${addressName}" association not available on contact form`);
      }
    }

    await this.oracle.clickButton('Save and Close');
    await this.oracle.dismissConfirmation();
    logger.pass('Contact saved');
  }

  /**
   * Verify a contact appears in the Contacts list. The grid renders the name as
   * "Last, First", so match on both name parts (order-independent) and email.
   * @param {{firstName:string, lastName:string, email:string}} contact
   */
  async expectContactListed(contact) {
    const nameCell = this.page
      .getByText(new RegExp(`${contact.lastName}.*${contact.firstName}|${contact.firstName}.*${contact.lastName}`, 'i'))
      .first();
    await expect(nameCell).toBeVisible();
    await expect(this.page.getByText(contact.email, { exact: false }).first()).toBeVisible();
    logger.pass(`Contact "${contact.lastName}, ${contact.firstName}" listed`);
  }
}
