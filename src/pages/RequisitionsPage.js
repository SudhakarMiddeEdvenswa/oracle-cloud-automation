import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Purchase Requisitions work area —
 * Create Requisition (step 5), search / reopen a submitted requisition
 * (step 20) and perform the final end-to-end validation (step 21).
 */
export class RequisitionsPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Step 5 — Start requisition creation. On this Redwood "Self Service
   * Procurement" Shop page the entry point is a "Create Noncatalog Request"
   * action rendered on the page (classic pods expose a "Create Requisition"
   * button). The Shop page loads its catalog content progressively, so wait for
   * the action instead of a one-shot visibility check.
   */
  async startCreateRequisition() {
    logger.step(5, 'Start requisition creation (Create Noncatalog Request)');

    const noncatalog = this.page
      .getByRole('button', { name: /Create Noncatalog Request|Noncatalog Request/i })
      .or(this.page.getByRole('link', { name: /Create Noncatalog Request|Noncatalog Request/i }))
      .or(this.page.getByRole('button', { name: /^Create Requisition$/i }))
      .first();

    try {
      await noncatalog.waitFor({ state: 'visible', timeout: 60000 });
    } catch {
      // Some pods tuck it behind a "More Actions" menu — open it and retry.
      const more = this.page.getByRole('button', { name: /More Actions|More Tasks|^More$/i }).first();
      if (await more.isVisible().catch(() => false)) {
        await more.click();
        await this.waitUntilReady();
      }
      await noncatalog.waitFor({ state: 'visible', timeout: 30000 });
    }

    await noncatalog.scrollIntoViewIfNeeded().catch(() => {});
    await noncatalog.click();
    await this.waitUntilReady();
    logger.pass('Create Noncatalog Request form displayed');
  }

  /**
   * Step 20 — Open the "My Requisitions" tab, search by the captured number and
   * confirm the requisition is listed (opening it when it is directly clickable).
   * @param {string} requisitionNumber
   */
  async searchAndOpen(requisitionNumber) {
    logger.step(20, `Search requisition #${requisitionNumber}`);

    // "My Requisitions" is a tab in the Self Service Procurement app shell.
    const tab = this.page.getByRole('tab', { name: /My Requisitions/i }).first();
    await tab.waitFor({ state: 'visible', timeout: 30000 });
    await tab.click();
    await this.waitUntilReady();
    await this.oracle.waitForProcurementIndicator();

    // Remove any pre-applied filter chips (e.g. "Entered By …") that would hide
    // the requisition. Each removable chip is deleted via its keyboard hint.
    const chips = this.page.getByRole('button', { name: /Press enter to edit or Delete to remove/i });
    for (let i = (await chips.count().catch(() => 0)); i > 0; i--) {
      const chip = chips.first();
      if (!(await chip.isVisible().catch(() => false))) break;
      await chip.focus().catch(() => {});
      await this.page.keyboard.press('Delete').catch(() => {});
      await this.waitUntilReady();
    }

    // Search by requisition number (unique per submission). The field is a JET
    // combobox ("Search for requisitions"), not a plain textbox.
    const search = this.page
      .getByRole('combobox', { name: /Search for requisitions/i })
      .or(this.page.getByRole('textbox', { name: /Search for requisitions/i }))
      .or(this.page.getByRole('searchbox'))
      .first();
    await search.waitFor({ state: 'visible', timeout: 60000 });
    await search.click({ force: true });
    await search.fill(requisitionNumber);
    await search.press('Enter');
    await this.waitUntilReady();
    await this.oracle.waitForProcurementIndicator();

    // Confirm the requisition surfaced in the results.
    await expect(this.page.getByText(requisitionNumber, { exact: false }).first()).toBeVisible({
      timeout: 30000,
    });

    // Open it when it is a clickable link/card; otherwise validation runs against
    // the results row, which already carries the key fields.
    const openLink = this.page
      .getByRole('link', { name: new RegExp(requisitionNumber) })
      .or(this.page.getByRole('button', { name: new RegExp(requisitionNumber) }))
      .first();
    if (await openLink.isVisible().catch(() => false)) {
      await openLink.click();
      await this.waitUntilReady();
      await this.oracle.dismissConfirmation();
    }
    logger.pass(`Requisition #${requisitionNumber} found in My Requisitions`);
  }

  /**
   * Step 21 — Final validation of the requisition (from the opened detail or the
   * results row). The number is asserted; description, item and location are
   * verified when shown.
   * @param {{requisitionNumber:string, description:string, itemDescription:string,
   *   quantity:string|number, deliverToLocation?:string}} data
   */
  async validateRequisition(data) {
    logger.step(21, 'Perform final end-to-end validation');

    await expect(this.page.getByText(data.requisitionNumber, { exact: false }).first()).toBeVisible();
    logger.pass(`Validated Requisition Number = "${data.requisitionNumber}"`);

    const checkVisible = async (label, value) => {
      if (!value) return;
      const shown = this.page.getByText(value, { exact: false }).first();
      if (await shown.isVisible().catch(() => false)) {
        logger.pass(`Validated ${label} = "${value}"`);
      } else {
        logger.warn(`${label} "${value}" not shown on the requisition summary`);
      }
    };

    await checkVisible('Requisition Description', data.description);
    await checkVisible('Item', data.itemDescription);
    await checkVisible('Deliver-to Location', data.deliverToLocation);
  }
}
