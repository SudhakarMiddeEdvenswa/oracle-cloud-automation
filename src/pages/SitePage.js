import { BasePage } from './BasePage.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 12–16 — Supplier Sites: create site, configure receiving,
 * site assignments, save.
 */
export class SitePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /** Step 12 — Open Sites tab and start a new site. */
  async startCreateSite() {
    logger.step(12, 'Navigate to Sites and click Create');
    const createBtn = this.page
      .getByRole('button', { name: /^(Create|Add|Actions)$/i })
      .first();
    await createBtn.waitFor({ state: 'visible' });
    await createBtn.click();
    await this.waitUntilReady();
    logger.pass('Supplier Site creation form displayed');
  }

  /**
   * Step 13 — Enter site name and address.
   * @param {{siteName:string, address:string}} site
   */
  async enterSiteInfo(site) {
    logger.step(13, 'Create supplier site');
    await this.oracle.selectFromLov('Address Name', site.address);
    await this.oracle.fillByLabel('Site', site.siteName);

    // Business Unit is required in many pods; select from env if provided.
    const bu = env.procurementBusinessUnit;
    if (bu) {
      await this.oracle.selectFromLov('Business Unit', bu).catch(() => {
        logger.warn(`Business Unit "${bu}" not selectable on this form`);
      });
    }
    logger.pass('Supplier site information accepted');
  }

  /**
   * Step 14 — Configure receiving (Receipt Routing).
   * @param {string} receiptRouting
   */
  async configureReceiving(receiptRouting) {
    logger.step(14, `Configure Receiving: Receipt Routing = ${receiptRouting}`);
    await this.openSubTab('Receiving');
    await this.oracle.selectFromLov('Receipt Routing', receiptRouting);
    logger.pass('Receipt Routing configured');
  }

  /** Step 15 — Configure site assignments (autocreate or manual BU). */
  async configureSiteAssignments() {
    logger.step(15, 'Configure Site Assignment');
    await this.openSubTab('Site Assignments');

    const autoCreate = this.page
      .getByRole('button', { name: /Autocreate Assignments/i })
      .first();
    if (await autoCreate.isVisible().catch(() => false)) {
      await autoCreate.click();
      await this.waitUntilReady();
      logger.pass('Autocreate Assignments used');
      return;
    }

    // Manual path: add a row and pick the configured Procurement BU.
    const bu = env.procurementBusinessUnit;
    await this.oracle.clickButton('Add');
    if (bu) {
      await this.oracle.selectFromLov('Business Unit', bu);
    }
    logger.pass('Site assignment configured manually');
  }

  /** Step 16 — Save and close the supplier site. */
  async saveSite() {
    logger.step(16, 'Save Supplier Site');
    await this.oracle.clickButton('Save and Close');
    logger.pass('Supplier Site saved');
  }

  /**
   * Open a site sub-tab (Receiving, Site Assignments, …) by name.
   * @param {string} name
   */
  async openSubTab(name) {
    const subTab = this.page
      .getByRole('tab', { name, exact: false })
      .or(this.page.getByRole('link', { name: new RegExp(`^${name}$`, 'i') }))
      .first();
    await subTab.waitFor({ state: 'visible' });
    await subTab.click();
    await this.waitUntilReady();
  }

  /**
   * Verify a site appears in the supplier's Sites list.
   * @param {string} siteName
   */
  async expectSiteListed(siteName) {
    await expect(this.page.getByText(siteName, { exact: false }).first()).toBeVisible();
    logger.pass(`Supplier Site "${siteName}" listed`);
  }
}
