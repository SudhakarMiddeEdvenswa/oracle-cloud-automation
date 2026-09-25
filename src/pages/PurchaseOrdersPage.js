import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Purchase Orders work area —
 * Start a new order from the Tasks panel (step 5), search / reopen a submitted
 * order (step 22) and perform the final end-to-end validation (step 23).
 *
 * Locators are role/label-driven (per the automation prompt) and defensive: the
 * exact wording of the Tasks-panel action and the search control varies between
 * classic ADF and Redwood pods, so several accessible names are matched.
 */
export class PurchaseOrdersPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Step 5 — Start purchase-order creation. On most pods the entry point is a
   * "Create Order" task in the Tasks panel; some label it "Create Purchase
   * Order". Open the Tasks panel first when the action is not directly visible.
   */
  async startCreateOrder() {
    logger.step(5, 'Start purchase order creation (Create Order)');

    const createOrder = this.page
      .getByRole('link', { name: /Create Order|Create Purchase Order/i })
      .or(this.page.getByRole('button', { name: /Create Order|Create Purchase Order/i }))
      .first();

    try {
      await createOrder.waitFor({ state: 'visible', timeout: 30000 });
    } catch {
      // The action lives in the Tasks side panel on classic pods — open it.
      const tasks = this.page.getByRole('button', { name: /^Tasks$/i }).first();
      if (await tasks.isVisible().catch(() => false)) {
        await tasks.click();
        await this.waitUntilReady();
      }
      await createOrder.waitFor({ state: 'visible', timeout: 30000 });
    }

    await createOrder.scrollIntoViewIfNeeded().catch(() => {});
    await createOrder.click();
    await this.waitUntilReady();
    logger.pass('Create Order action invoked');
  }

  /**
   * Step 22 — Open Manage Orders, search by the captured PO number and confirm
   * the order is listed (opening it when it is directly clickable).
   * @param {string} orderNumber
   */
  async searchAndOpen(orderNumber) {
    logger.step(22, `Search purchase order #${orderNumber}`);

    // Manage Orders is a task in the Purchase Orders work area; open it if the
    // search field is not already on screen.
    const search = this.page
      .getByRole('combobox', { name: /Search|Order/i })
      .or(this.page.getByRole('textbox', { name: /Order|Search/i }))
      .or(this.page.getByRole('searchbox'))
      .first();

    if (!(await search.isVisible().catch(() => false))) {
      const manage = this.page.getByRole('link', { name: /Manage Orders/i }).first();
      if (await manage.isVisible().catch(() => false)) {
        await manage.click();
        await this.waitUntilReady();
      }
    }

    await search.waitFor({ state: 'visible', timeout: 60000 });
    await search.click({ force: true });
    await search.fill(orderNumber);
    await search.press('Enter');
    await this.waitUntilReady();
    await this.oracle.waitForProcurementIndicator();

    // Match the number with digit boundaries so "204505" cannot be satisfied by
    // "2045051".
    const numberRe = exactNumberRegex(orderNumber);
    await expect(this.page.getByText(numberRe).first()).toBeVisible({ timeout: 30000 });

    const openLink = this.page
      .getByRole('link', { name: numberRe })
      .or(this.page.getByRole('button', { name: numberRe }))
      .first();
    if (await openLink.isVisible().catch(() => false)) {
      await openLink.click();
      await this.waitUntilReady();
      await this.oracle.dismissConfirmation();
    }
    logger.pass(`Purchase order #${orderNumber} found in Manage Orders`);
  }

  /**
   * Step 23 — Final validation of the purchase order (from the opened detail or
   * the results row). The number is asserted; supplier, item, description and
   * ship-to are verified when shown.
   * @param {{orderNumber:string, description:string, supplier:string,
   *   supplierSite?:string, itemDescription:string, quantity:string|number,
   *   shipToLocation?:string}} data
   */
  async validatePurchaseOrder(data) {
    logger.step(23, 'Perform final end-to-end validation');

    await expect(this.page.getByText(exactNumberRegex(data.orderNumber)).first()).toBeVisible();
    logger.pass(`Validated Purchase Order Number = "${data.orderNumber}"`);

    const checkVisible = async (label, value) => {
      if (!value) return;
      const shown = this.page.getByText(value, { exact: false }).first();
      if (await shown.isVisible().catch(() => false)) {
        logger.pass(`Validated ${label} = "${value}"`);
      } else {
        logger.warn(`${label} "${value}" not shown on the purchase order summary`);
      }
    };

    await checkVisible('PO Description', data.description);
    await checkVisible('Supplier', data.supplier);
    await checkVisible('Supplier Site', data.supplierSite);
    await checkVisible('Item', data.itemDescription);
    await checkVisible('Ship-to Location', data.shipToLocation);
  }
}

/**
 * A regex that matches a numeric identifier only when it is not part of a longer
 * run of digits, so "204505" does not match inside "2045051".
 * @param {string|number} n
 * @returns {RegExp}
 */
function exactNumberRegex(n) {
  const digits = String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\d)${digits}(?!\\d)`);
}
