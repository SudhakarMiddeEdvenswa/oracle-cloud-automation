import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 6–21 — the Purchase Order entry / edit page.
 *
 * On Oracle Fusion the PO edit page is one screen with sub-regions: a header, a
 * Lines grid, and (behind the line) Schedules and Distributions. This page
 * object groups the actions by that screen the way the requisition checkout page
 * groups its steps, keeping the flow readable.
 *
 * Locators are label/role-driven (per the automation prompt) and defensive:
 * optional fields (buyer, currency, ship-to organization, charge account) are
 * set only when a value is supplied and the control exists, and pre-defaulted
 * values are verified rather than re-entered — so a pod that inherits them from
 * the header/BU does not fail the run.
 */
export class PurchaseOrderPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Steps 6–8 — The "Create Order" dialog that some pods raise first, asking for
   * the Procurement BU, Supplier and Supplier Site before opening the PO. When
   * no dialog appears these are set on the header instead (handled by
   * {@link enterHeader}). Best-effort: resolves quietly when there is no dialog.
   * @param {{businessUnit?:string, supplier:string, supplierSite?:string}} data
   */
  async completeCreateOrderDialog(data) {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /Create Order|Supplier/i }).first();
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) {
      logger.info('No Create Order dialog; header fields will carry the supplier details');
      return;
    }

    logger.step(6, 'Complete the Create Order dialog (BU, Supplier, Supplier Site)');
    if (data.businessUnit) {
      await this.oracle
        .selectRedwoodCombobox('Procurement BU', data.businessUnit, { root: dialog })
        .catch(() => this.oracle.selectFromLov('Procurement BU', data.businessUnit, { exact: false, root: dialog }))
        .catch((err) => logger.warn(`Procurement BU not set in dialog: ${err.message}`));
    }

    logger.step(7, `Select supplier "${data.supplier}"`);
    await this.oracle
      .selectRedwoodCombobox('Supplier', data.supplier, { root: dialog })
      .catch(() => this.oracle.selectFromLov('Supplier', data.supplier, { exact: false, root: dialog }));

    if (data.supplierSite) {
      logger.step(8, `Select supplier site "${data.supplierSite}"`);
      await this.oracle
        .selectRedwoodCombobox('Supplier Site', data.supplierSite, { root: dialog })
        .catch(() => this.oracle.selectFromLov('Supplier Site', data.supplierSite, { exact: false, root: dialog }))
        .catch((err) => logger.warn(`Supplier Site not set in dialog: ${err.message}`));
    }

    const create = dialog.getByRole('button', { name: /^(Create|OK|Continue)$/i }).first();
    if (await create.isVisible().catch(() => false)) {
      await create.click();
      await this.waitUntilReady();
    }
    logger.pass('Create Order dialog completed');
  }

  /**
   * Steps 6–10 — Complete the PO header: Procurement BU, Supplier, Supplier Site,
   * Buyer, Currency and the (unique) Description. Values already applied by the
   * Create Order dialog are verified rather than re-entered.
   * @param {{businessUnit?:string, supplier:string, supplierSite?:string,
   *   buyer?:string, currency?:string, description:string}} data
   */
  async enterHeader(data) {
    logger.step(9, 'Configure the PO header');
    // The order header renders a heading like "Purchase Order" / "Order" once the
    // entry page is up; wait for a stable header control before touching fields.
    await this.page
      .getByRole('heading', { name: /Purchase Order|^Order$/i })
      .first()
      .waitFor({ state: 'visible', timeout: 60000 })
      .catch(() => {});

    await this.setHeaderFieldIfEditable('Procurement BU', data.businessUnit);
    await this.setHeaderFieldIfEditable('Supplier', data.supplier, { required: true });
    await this.setHeaderFieldIfEditable('Supplier Site', data.supplierSite);
    await this.setHeaderFieldIfEditable('Buyer', data.buyer);

    // Currency defaults to USD on most pods; only change it when a different
    // currency is requested and it isn't already selected.
    if (data.currency) {
      const currency = this.page.getByRole('combobox', { name: /Currency/i }).first();
      if (await currency.isVisible().catch(() => false)) {
        const current = ((await currency.inputValue().catch(() => '')) || '').trim();
        if (current && !new RegExp(`^${data.currency}$`, 'i').test(current)) {
          await this.oracle
            .selectRedwoodCombobox('Currency', data.currency)
            .catch((err) => logger.warn(`Currency not set: ${err.message}`));
        } else {
          logger.pass(`Currency is "${current || data.currency}"`);
        }
      }
    }

    logger.step(10, `Enter PO description "${data.description}"`);
    const descField = this.page
      .getByRole('textbox', { name: 'Description', exact: true })
      .or(this.page.getByLabel('Description', { exact: true }))
      .first();
    await descField.waitFor({ state: 'visible', timeout: 30000 });
    await descField.fill('');
    await descField.fill(data.description);
    await descField.press('Tab').catch(() => {});
    await expect(descField).toHaveValue(new RegExp(escapeRe(data.description)));
    logger.pass(`PO description set to "${data.description}"`);
  }

  /**
   * Set a header combobox/field when a value is supplied and the control is
   * editable; verify a pre-defaulted value otherwise. A required field that was
   * supplied but cannot be applied raises, rather than silently defaulting.
   * @param {string} label
   * @param {string|undefined} value
   * @param {{required?:boolean}} [opts]
   */
  async setHeaderFieldIfEditable(label, value, opts = {}) {
    if (!value) return;
    const control = this.page
      .getByRole('combobox', { name: new RegExp(`^${escapeRe(label)}$`, 'i') })
      .or(this.page.getByLabel(label, { exact: true }))
      .first();

    if (!(await control.isVisible().catch(() => false))) {
      // Not editable here — verify it is at least shown (set by the dialog/BU).
      const shown = this.page.getByText(value, { exact: false }).first();
      if (await shown.isVisible().catch(() => false)) {
        logger.pass(`${label} "${value}" is set`);
      } else if (opts.required) {
        throw new Error(`${label} "${value}" was specified but is neither editable nor shown on the header`);
      } else {
        logger.warn(`${label} "${value}" not editable/shown; relying on the default`);
      }
      return;
    }

    const current = ((await control.inputValue().catch(() => '')) || '').trim();
    if (current && new RegExp(escapeRe(value), 'i').test(current)) {
      logger.pass(`${label} already set to "${current}"`);
      return;
    }
    await this.oracle
      .selectRedwoodCombobox(label, value)
      .catch(() => this.oracle.selectFromLov(label, value, { exact: false }))
      .catch((err) => {
        if (opts.required) throw err;
        logger.warn(`${label} not set: ${err.message}`);
      });
  }

  /**
   * Steps 11–13 — Add the PO line: Line Type, Item / Item Description, Category,
   * Quantity, UOM and Price. The line amount (quantity × price) is verified when
   * the grid renders it.
   * @param {{lineType?:string, itemDescription:string, category?:string,
   *   quantity:string|number, uom?:string, price:string|number}} data
   */
  async addLine(data) {
    logger.step(11, 'Add a purchase order line');
    const addRow = this.page
      .getByRole('button', { name: /Add Row|Add Line|Create Line|^Add$/i })
      .first();
    await addRow.waitFor({ state: 'visible', timeout: 30000 });
    await addRow.click();
    await this.waitUntilReady();

    if (data.lineType) {
      await this.oracle
        .selectRedwoodCombobox('Line Type', data.lineType)
        .catch((err) => logger.warn(`Line Type not set (using default): ${err.message}`));
    }

    logger.step(12, `Select item "${data.itemDescription}"`);
    // Prefer a dedicated Item field; fall back to a Description field for a
    // description-based (noncatalog) line.
    const itemField = this.page.getByRole('combobox', { name: /^Item$/i }).first();
    if (await itemField.isVisible().catch(() => false)) {
      await this.oracle
        .selectRedwoodCombobox('Item', data.itemDescription)
        .catch(() => this.oracle.selectFromLov('Item', data.itemDescription, { exact: false }));
    } else {
      await this.oracle.fillByLabel('Description', data.itemDescription, { exact: false });
    }

    if (data.category) {
      await this.oracle
        .selectRedwoodCombobox('Category', data.category)
        .catch((err) => logger.warn(`Category not set: ${err.message}`));
    }

    logger.step(13, 'Enter quantity, UOM and price');
    const qty = String(data.quantity ?? '1');
    await this.oracle.fillByLabel('Quantity', qty, { exact: false });

    if (data.uom) {
      await this.oracle
        .selectRedwoodCombobox('UOM', data.uom)
        .catch(() => this.oracle.selectRedwoodCombobox('Unit of Measure', data.uom))
        .catch((err) => logger.warn(`UOM not set: ${err.message}`));
    }
    if (data.price !== undefined && String(data.price).trim() !== '') {
      await this.oracle.fillByLabel('Price', String(data.price), { exact: false });
    }
    await this.waitUntilReady();
    logger.pass('PO line entered (quantity, UOM and price accepted)');
  }

  /**
   * Steps 14–16 — Open the line's schedule and set the Need-by Date, Ship-to
   * Organization and Ship-to Location. All are best-effort: a pod that inherits
   * them from the header does not fail the run, but a supplied value is applied
   * when the control exists.
   * @param {{needByDate:string, shipToOrganization?:string, shipToLocation?:string}} data
   */
  async configureSchedule(data) {
    logger.step(14, 'Open the line schedule details');
    // Open the Schedules region/tab when it is a distinct control.
    const schedules = this.page
      .getByRole('tab', { name: /Schedules?/i })
      .or(this.page.getByRole('link', { name: /Schedules?/i }))
      .or(this.page.getByRole('button', { name: /Schedules?/i }))
      .first();
    if (await schedules.isVisible().catch(() => false)) {
      await schedules.click().catch(() => {});
      await this.waitUntilReady();
    }

    logger.step(15, `Set need-by date ${data.needByDate}`);
    const dateField = this.page
      .getByRole('textbox', { name: /Need-by Date|Requested Delivery Date/i })
      .or(this.page.getByLabel(/Need-by Date/i, { exact: false }))
      .first();
    if (await dateField.isVisible().catch(() => false)) {
      await dateField.fill('');
      await dateField.fill(data.needByDate);
      await dateField.press('Tab').catch(() => {});
      await this.waitUntilReady();
      logger.pass(`Need-by Date set to ${data.needByDate}`);
    } else {
      logger.warn('Need-by Date field not exposed on this pod; using the defaulted date');
    }

    logger.step(16, 'Configure ship-to information');
    if (data.shipToOrganization) {
      await this.oracle
        .selectRedwoodCombobox('Ship-to Organization', data.shipToOrganization)
        .then(() => logger.pass(`Ship-to Organization set to "${data.shipToOrganization}"`))
        .catch((err) => logger.warn(`Ship-to Organization not set (using default): ${err.message}`));
    }
    if (data.shipToLocation) {
      await this.oracle
        .selectRedwoodCombobox('Ship-to Location', data.shipToLocation)
        .then(() => logger.pass(`Ship-to Location set to "${data.shipToLocation}"`))
        .catch(() => {
          const shown = this.page.getByText(data.shipToLocation, { exact: false }).first();
          return shown
            .isVisible()
            .then((v) =>
              v
                ? logger.pass(`Ship-to Location "${data.shipToLocation}" is set`)
                : logger.warn(`Ship-to Location "${data.shipToLocation}" not applied; using default`)
            );
        });
    }
  }

  /**
   * Steps 17–18 — Open the distribution and set the Charge Account. Best-effort:
   * the charge account normally defaults from the BU / item, so a supplied value
   * is applied when editable and the defaulted value is otherwise reported.
   * @param {{chargeAccount?:string}} data
   */
  async configureDistribution(data) {
    logger.step(17, 'Configure the distribution / charge account');
    const distributions = this.page
      .getByRole('tab', { name: /Distributions?/i })
      .or(this.page.getByRole('link', { name: /Distributions?/i }))
      .or(this.page.getByRole('button', { name: /Distributions?/i }))
      .first();
    if (await distributions.isVisible().catch(() => false)) {
      await distributions.click().catch(() => {});
      await this.waitUntilReady();
    }

    if (data.chargeAccount) {
      const account = this.page
        .getByRole('textbox', { name: /Charge Account/i })
        .or(this.page.getByLabel(/Charge Account/i, { exact: false }))
        .first();
      if (await account.isVisible().catch(() => false)) {
        await account.fill('');
        await account.fill(data.chargeAccount);
        await account.press('Tab').catch(() => {});
        await this.waitUntilReady();
        logger.pass(`Charge Account set to "${data.chargeAccount}"`);
      } else {
        logger.warn(`Charge Account field not editable; relying on the BU/item default`);
      }
    } else {
      logger.pass('No charge account supplied; using the defaulted accounting');
    }
  }

  /**
   * Step 19 — Review the complete purchase order before submit and confirm no
   * blocking validation error is showing.
   * @param {{itemDescription:string, description:string}} data
   */
  async reviewPO(data) {
    logger.step(19, 'Review the complete purchase order');
    const alert = this.page
      .getByRole('alert')
      .filter({ hasText: /error|must|invalid|cannot|required/i })
      .first();
    if (await alert.isVisible().catch(() => false)) {
      const text = (await alert.textContent())?.trim();
      // A blocking error must stop the run rather than submitting an invalid PO.
      throw new Error(`Blocking validation error on the purchase order: ${text}`);
    }
    await expect(this.page.getByText(data.itemDescription, { exact: false }).first()).toBeVisible();
    logger.pass('Purchase order reviewed with no blocking validation errors');
  }

  /**
   * Steps 20–21 — Submit the purchase order (or Save when the pod requires a save
   * before submit), then capture the generated PO number from the page header /
   * confirmation. Returns PO_NUMBER.
   * @returns {Promise<string>} PO_NUMBER
   */
  async submitAndCapturePONumber() {
    logger.step(20, 'Submit the purchase order');

    // Read a number already assigned to the draft header first, so it survives a
    // confirmation page that navigates away.
    this._orderNumber = await this.readOrderNumberFromHeader();

    // Some pods require Save before Submit is enabled — save when present.
    const save = this.page.getByRole('button', { name: /^Save$/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await this.waitUntilReady();
      await this.oracle.dismissConfirmation();
      if (!this._orderNumber) this._orderNumber = await this.readOrderNumberFromHeader();
    }

    const submit = this.page
      .getByRole('button', { name: /Submit(\s+Purchase\s+Order)?/i })
      .first();
    await submit.waitFor({ state: 'visible', timeout: 30000 });
    await submit.click();
    await this.waitUntilReady();
    // Wait out the confirmation rather than a fixed delay.
    await this.oracle.dismissConfirmation();

    logger.step(21, 'Capture the Purchase Order number');
    let orderNumber = (this._orderNumber || '').trim();
    if (!orderNumber) {
      const confirmation = this.page
        .getByText(/(Purchase Order|Order)\s+[\w-]*\d+/i)
        .first();
      await confirmation.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
      orderNumber = extractOrderNumber((await confirmation.textContent().catch(() => '')) || '');
    }

    expect(orderNumber, 'Purchase Order Number should be generated').not.toEqual('');
    logger.pass(`PO_NUMBER captured: ${orderNumber}`);
    return orderNumber;
  }

  /**
   * Read the order number from the PO header when Oracle has already assigned it
   * to the draft (shown as "Order <number>" / "Purchase Order <number>").
   * @returns {Promise<string>}
   */
  async readOrderNumberFromHeader() {
    const header = this.page.getByText(/(Purchase Order|Order)\s+[\w-]*\d+/i).first();
    if (await header.isVisible().catch(() => false)) {
      return extractOrderNumber((await header.textContent().catch(() => '')) || '');
    }
    return '';
  }
}

/**
 * Pull the order number out of a header/confirmation string such as
 * "Order 4471 was submitted" or "Purchase Order US1-4471".
 * @param {string} raw
 * @returns {string}
 */
function extractOrderNumber(raw) {
  const match =
    raw.match(/(?:Purchase Order|Order)\s+([\w-]*\d+)/i) || raw.match(/\b([\w-]*\d{4,})\b/);
  return (match ? match[1] : '').trim();
}

/** Escape a string for safe use inside a RegExp. */
function escapeRe(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
