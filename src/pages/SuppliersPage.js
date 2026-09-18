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
    logger.step(20, `Search supplier ${supplierName} (#${supplierNumber})`);

    // Open the Tasks panel (if needed) and go to the "Manage Suppliers" search.
    const manage = this.page.getByRole('link', { name: 'Manage Suppliers', exact: true }).first();
    if (!(await manage.isVisible().catch(() => false))) {
      const tasksToggle = this.page.getByRole('link', { name: /^Tasks$/i }).first();
      if (await tasksToggle.isVisible().catch(() => false)) {
        await tasksToggle.click();
        await this.waitUntilReady();
      }
    }
    await manage.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page
      .getByRole('heading', { name: /^Manage Suppliers$/i })
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Search by Keywords (the generated supplier name is unique per run).
    const keywords = this.page.getByRole('textbox', { name: 'Keywords', exact: true }).first();
    await keywords.fill(supplierName);
    await this.page.getByRole('button', { name: 'Search', exact: true }).first().click();
    await this.waitUntilReady();

    // Open the supplier from the results.
    const resultLink = this.page.getByRole('link', { name: supplierName }).first();
    await expect(resultLink).toBeVisible({ timeout: 60000 });
    await resultLink.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.oracle.dismissConfirmation();
    logger.pass(`Supplier "${supplierName}" opened from search results`);
  }
}
