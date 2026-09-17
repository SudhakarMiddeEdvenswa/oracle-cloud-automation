import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Suppliers work area — Create Supplier (step 5) and
 * Search / Reopen supplier (step 20).
 */
export class SuppliersPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Open the collapsible Tasks side panel on the Suppliers work area so its
   * task links (Create Supplier, Manage Suppliers, …) become visible.
   */
  async openTasksPanel() {
    const taskLink = this.page.getByRole('link', { name: /^Create Supplier$/i }).first();
    // Already open? Nothing to do.
    if (await taskLink.isVisible().catch(() => false)) return;

    logger.info('Open Tasks panel');
    const tasksToggle = this.page.getByRole('link', { name: /^Tasks$/i }).first();
    await tasksToggle.waitFor({ state: 'visible' });
    await tasksToggle.click();
    await this.waitUntilReady();
  }

  /** Step 5 — Start supplier creation. */
  async startCreateSupplier() {
    logger.step(5, 'Click Create Supplier');
    await this.openTasksPanel();
    const createTask = this.page
      .getByRole('link', { name: /^Create Supplier$/i })
      .first();
    await createTask.waitFor({ state: 'visible' });
    await createTask.click();
    await this.waitUntilReady();
    logger.pass('Create Supplier form displayed');
  }

  /**
   * Step 20 — Search for a supplier and open its record.
   * @param {string} supplierNumber
   * @param {string} supplierName - fallback search value
   */
  async searchAndOpen(supplierNumber, supplierName) {
    logger.step(20, `Search supplier ${supplierNumber || supplierName}`);

    // Open the Tasks panel and use the "Manage Suppliers" search task.
    const manage = this.page.getByRole('link', { name: /Manage Suppliers/i }).first();
    if (!(await manage.isVisible().catch(() => false))) {
      const tasksToggle = this.page.getByRole('link', { name: /^Tasks$/i }).first();
      if (await tasksToggle.isVisible().catch(() => false)) {
        await tasksToggle.click();
        await this.waitUntilReady();
      }
    }
    if (await manage.isVisible().catch(() => false)) {
      await manage.click();
      await this.waitUntilReady();
    }

    const term = supplierNumber || supplierName;
    let searchBox = this.page.getByLabel('Supplier', { exact: false }).first();

    if (supplierNumber) {
      const numberBox = this.page.getByLabel('Supplier Number', { exact: false }).first();
      if (await numberBox.isVisible().catch(() => false)) {
        searchBox = numberBox;
      }
    }

    await searchBox.waitFor({ state: 'visible' });
    await searchBox.fill(term);
    await this.oracle.clickButton('Search');

    const resultLink = this.page.getByRole('link', { name: supplierName }).first();
    await expect(resultLink).toBeVisible({ timeout: 60000 });
    await resultLink.click();
    await this.waitUntilReady();
    logger.pass(`Supplier "${supplierName}" opened from search results`);
  }
}
