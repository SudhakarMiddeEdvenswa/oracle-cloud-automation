import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 6–11 — Create Noncatalog Request form → cart → checkout.
 *
 * On this Redwood pod "Create Requisition" opens the "Create Noncatalog
 * Request" form directly (there is no catalog search step), so the item is
 * entered by hand: Item Description, Category, Quantity, UOM and Price. The item
 * is then added to the cart and the requisition proceeds to checkout.
 *
 * Locators are label/role-driven (per the automation prompt) and defensive:
 * optional fields are set only when a value is supplied and the control exists.
 */
export class CreateRequisitionPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /** The "Create Noncatalog Request" form heading. */
  noncatalogHeading() {
    return this.page.getByRole('heading', { name: /Create Noncatalog Request/i }).first();
  }

  /**
   * Steps 6–7 — Enter the item description and its category on the noncatalog
   * request form (the Item Type defaults to "Goods billed by quantity").
   * @param {{itemDescription:string, category?:string}} data
   */
  async enterItemDetails(data) {
    logger.step(6, `Enter item description "${data.itemDescription}"`);
    await this.noncatalogHeading().waitFor({ state: 'visible', timeout: 60000 });

    await this.oracle.fillByLabel('Item Description', data.itemDescription, { exact: false });

    logger.step(7, 'Set item category and type');
    if (data.category) {
      // Category is a Required Redwood combobox. Select the configured value and
      // fail if it is not available — never substitute an arbitrary category,
      // which would submit a requisition that does not match the test data.
      await this.oracle.selectRedwoodCombobox('Category', data.category);
    }
    // Item Type is a required combobox that Oracle defaults to
    // "Goods billed by quantity"; leave the default unless the data overrides it.
    logger.pass('Item details entered');
  }

  /**
   * Step 8 — Enter quantity, UOM and price (all drive the line amount).
   * @param {{quantity:string|number, uom?:string, price?:string|number, currency?:string}} data
   */
  async enterQuantityAndPrice(data) {
    const qty = String(data.quantity ?? '1');
    logger.step(8, `Enter quantity ${qty}, UOM and price`);

    await this.oracle.fillByLabel('Quantity', qty, { exact: false });

    if (data.uom) {
      // UOM is a Required Redwood combobox. Select the configured value and fail
      // if it is not available (see Category note above).
      await this.oracle.selectRedwoodCombobox('UOM', data.uom);
    }
    if (data.price !== undefined && String(data.price).trim() !== '') {
      // The price field is labelled "Price $" (currency suffix); match loosely.
      await this.oracle.fillByLabel('Price', String(data.price), { exact: false });
    }
    // Currency defaults to USD on this pod; only change it when a different
    // currency is requested and it isn't already selected.
    if (data.currency) {
      const currency = this.page.getByRole('combobox', { name: /Currency/i }).first();
      const current = ((await currency.textContent().catch(() => '')) || '').trim();
      if (current && !new RegExp(`^${data.currency}$`, 'i').test(current)) {
        await this.oracle
          .selectRedwoodCombobox('Currency', data.currency)
          .catch((err) => logger.warn(`Currency not set: ${err.message}`));
      }
    }

    logger.pass('Quantity, UOM and price accepted');
  }

  /**
   * Step 9 — Add the item to the cart. On the noncatalog form this is the
   * "Add to Cart" action in the page toolbar.
   */
  async addToCart() {
    logger.step(9, 'Add item to cart');
    await this.oracle.clickButton('Add to Cart');
    await this.waitUntilReady();
    // Adding returns to the Shop page, which shows a page-loading indicator.
    await this.oracle.waitForProcurementIndicator();

    // A confirmation ("Request added to cart") plus the Cart tab confirm success.
    const cart = this.cartControl();
    await expect(cart).toBeVisible({ timeout: 30000 });
    logger.pass('Item added to cart');
  }

  /**
   * The cart entry point — a "Cart" tab in the Shop page tablist. Scoped to the
   * tab role so it never matches a header CTA button that merely contains "Cart".
   */
  cartControl() {
    return this.page
      .getByRole('tab', { name: /Cart/i })
      .or(this.page.getByRole('button', { name: /^(Shopping Cart|View Cart)$/i }))
      .first();
  }

  /**
   * Step 10 — Open the shopping cart and verify the item is present.
   * @param {string} itemDescription
   */
  async openCart(itemDescription) {
    logger.step(10, 'Open shopping cart');
    await this.oracle.waitForProcurementIndicator();
    const cart = this.cartControl();
    await cart.waitFor({ state: 'visible' });
    await cart.click();
    await this.waitUntilReady();

    // A "Review" / cart panel lists the line. Verify the item is present when the
    // description is shown (Redwood sometimes shows only the item number here).
    const item = this.page.getByText(itemDescription, { exact: false }).first();
    if (await item.isVisible({ timeout: 10000 }).catch(() => false)) {
      logger.pass('Cart contains the selected item');
    } else {
      logger.warn('Item description not shown in cart summary; proceeding to checkout');
    }
  }

  /**
   * Step 11 — Reach the checkout. On this Redwood pod the Cart page IS the
   * checkout/review page (it carries the Description/Justification fields and a
   * Submit action), so there is no separate "Checkout" navigation — just confirm
   * the Cart page has loaded.
   */
  async checkout() {
    logger.step(11, 'Proceed to checkout (the Cart page is the checkout page)');
    await expect(
      this.page
        .getByRole('heading', { name: /^Cart$/i })
        .or(this.page.getByRole('button', { name: /^Submit$/i }))
        .first()
    ).toBeVisible({ timeout: 60000 });
    logger.pass('Requisition checkout (Cart) page displayed');
  }
}
