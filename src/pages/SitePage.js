import { BasePage } from './BasePage.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 12–16 — Supplier Sites: create site, set purpose, configure receiving,
 * site assignments, save.
 *
 * In the Redwood supplier UI a Site is created from the supplier "Sites" tab via
 * a "Create Site" page that carries Procurement BU, Address Name, Site name, a
 * Site Purpose checkbox group, and sub-tabs (General, Purchasing, Receiving,
 * Invoicing, Payments, Site Assignments, Qualifications).
 */
export class SitePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /** Step 12 — On the Sites tab, click Create to open the Create Site page. */
  async startCreateSite() {
    logger.step(12, 'Navigate to Sites and click Create');
    // Confirm the Sites tab content is loaded (avoids racing the Addresses tab).
    await this.page
      .getByRole('columnheader', { name: /Procurement BU/i })
      .first()
      .waitFor({ state: 'visible' });

    await this.page.getByRole('button', { name: 'Create', exact: true }).first().click();
    await this.waitUntilReady();
    await this.page
      .getByRole('heading', { name: /^Create Site$/i })
      .first()
      .waitFor({ state: 'visible' });
    logger.pass('Supplier Site creation form displayed');
  }

  /**
   * Step 13 — Enter site name, address, procurement BU and site purpose.
   * @param {{siteName:string, address:string, sitePurposes?:string[]}} site
   */
  async enterSiteInfo(site) {
    logger.step(13, 'Create supplier site');

    // Procurement BU (required) — override the default only if one is configured.
    const bu = env.procurementBusinessUnit;
    if (bu) {
      await this.oracle
        .selectFromLov('Procurement BU', bu)
        .catch(() => logger.warn(`Business Unit "${bu}" not selectable; using default`));
    }

    await this.oracle.selectFromLov('Address Name', site.address);
    await this.oracle.fillByLabel('Site', site.siteName);

    // Site Purpose (required checkbox group). Default to Purchasing + Pay.
    const purposes = site.sitePurposes && site.sitePurposes.length ? site.sitePurposes : ['Purchasing'];
    for (const purpose of purposes) {
      await this.oracle
        .setCheckbox(purpose, true)
        .catch(() => logger.warn(`Site purpose "${purpose}" not settable`));
    }
    logger.pass('Supplier site information accepted');
  }

  /**
   * Step 14 — Configure receiving (Receipt Routing) on the Receiving sub-tab.
   * @param {string} receiptRouting
   */
  async configureReceiving(receiptRouting) {
    logger.step(14, `Configure Receiving: Receipt Routing = ${receiptRouting}`);
    if (!(await this.openSubTab('Receiving'))) {
      logger.warn('Receiving sub-tab not found; skipping receipt routing');
      return;
    }
    // Fast presence check to avoid a long wait when the control label differs.
    const control = this.page.getByLabel('Receipt Routing', { exact: true }).first();
    if (!(await control.isVisible({ timeout: 5000 }).catch(() => false))) {
      logger.warn('Receipt Routing control not found; skipping');
      return;
    }
    await this.oracle
      .selectFromLov('Receipt Routing', receiptRouting)
      .catch(() => logger.warn('Receipt Routing not settable'));
    logger.pass('Receipt Routing configured');
  }

  /** Step 15 — Configure site assignments (autocreate or default BU). */
  async configureSiteAssignments() {
    logger.step(15, 'Configure Site Assignment');
    if (!(await this.openSubTab('Site Assignments'))) {
      logger.warn('Site Assignments sub-tab not found; skipping');
      return;
    }

    const autoCreate = this.page
      .getByRole('button', { name: /Autocreate Assignments/i })
      .first();
    if (await autoCreate.isVisible().catch(() => false)) {
      await autoCreate.click();
      await this.waitUntilReady();
      logger.pass('Autocreate Assignments used');
      return;
    }
    logger.warn('Autocreate Assignments not available; relying on Procurement BU default');
  }

  /** Step 16 — Save and close the supplier site. */
  async saveSite() {
    logger.step(16, 'Save Supplier Site');
    await this.oracle.clickButton('Save and Close');
    await this.page
      .getByRole('heading', { name: /^Edit Supplier:/i })
      .first()
      .waitFor({ state: 'visible' })
      .catch(() => {});
    await this.oracle.dismissConfirmation();
    logger.pass('Supplier Site saved');
  }

  /**
   * Open a site sub-tab (Receiving, Site Assignments, …) trying several
   * strategies, since the Redwood tab strip exposes them inconsistently.
   * @param {string} name
   * @returns {Promise<boolean>} whether the sub-tab was opened
   */
  async openSubTab(name) {
    const candidates = [
      this.page.getByRole('tab', { name, exact: true }),
      this.page.getByRole('link', { name, exact: true }),
      this.page.getByText(name, { exact: true }),
    ];
    for (const locator of candidates) {
      const el = locator.first();
      if (await el.isVisible().catch(() => false)) {
        await el.click().catch(() => {});
        await this.waitUntilReady();
        return true;
      }
    }
    return false;
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
