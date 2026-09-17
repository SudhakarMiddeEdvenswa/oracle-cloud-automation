import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 2–4 — Oracle Cloud home page, Navigator, Procurement, Suppliers.
 */
export class HomePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    // On the Fusion global header, Navigator renders as a link (role=link).
    this.navigatorIcon = page
      .getByRole('link', { name: /^Navigator$/i })
      .or(page.getByRole('button', { name: /Navigator/i }));
    this.homeHeader = page.getByRole('link', { name: /^Home$/i });
  }

  /** Verify the home page has loaded (Expected for step 1). */
  async verifyLoaded() {
    logger.step(1, 'Verify Oracle Cloud home page is displayed');
    await expect(this.navigatorIcon.first()).toBeVisible({ timeout: 90000 });
    logger.pass('Oracle Cloud home page displayed');
  }

  /** Step 2 — Open the Navigator menu. */
  async openNavigator() {
    logger.step(2, 'Open Navigator menu');
    await this.navigatorIcon.first().click();
    await this.waitUntilReady();
    await expect(this.page.getByText(/Procurement/i).first()).toBeVisible();
    logger.pass('Navigator menu displayed');
  }

  /** Step 3 — Select Procurement from the Navigator. */
  async goToProcurement() {
    logger.step(3, 'Navigate to Procurement');
    // The Procurement group header can sit under the Navigator's sticky
    // header, which intercepts a normal click — force past it.
    await this.oracle.clickLink('Procurement', { force: true });
    logger.pass('Procurement options displayed');
  }

  /** Step 4 — Open Suppliers / Manage Suppliers. */
  async goToSuppliers() {
    logger.step(4, 'Open Suppliers / Manage Suppliers');
    // The Suppliers entry renders as a link under the expanded Procurement group.
    const suppliers = this.page.getByRole('link', { name: /^Suppliers$/i }).first();
    await suppliers.waitFor({ state: 'visible' });
    await suppliers.scrollIntoViewIfNeeded().catch(() => {});
    await suppliers.click({ force: true });
    await this.waitUntilReady();
    logger.pass('Suppliers page displayed');
  }
}
