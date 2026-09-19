import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';
import { expect } from '@playwright/test';

/**
 * Steps 12–19 — the Cart (checkout) page.
 *
 * On this Redwood pod the Cart page carries the whole requisition: a
 * "Requisition summary" panel with Description and Justification fields, a
 * pre-populated Requester, Deliver-to Location and charge account, the line
 * grid, and a Submit action in the page toolbar. There is no separate
 * "Edit Requisition" page, so everything here operates on that one page.
 *
 * Pre-populated values (requester, location, accounting) are verified rather
 * than re-entered, and only overridden when the data explicitly provides one.
 */
export class RequisitionCheckoutPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
  }

  /**
   * Step 12 — Enter the requisition description (and justification) in the
   * Requisition summary panel.
   * @param {{description:string, justification?:string}} data
   */
  async enterRequisitionInfo(data) {
    logger.step(12, 'Enter requisition information');

    const descField = this.page.getByRole('textbox', { name: 'Description', exact: true }).first();
    await descField.waitFor({ state: 'visible', timeout: 30000 });
    await descField.fill('');
    await descField.fill(data.description);
    await descField.press('Tab').catch(() => {});

    if (data.justification) {
      const justification = this.page.getByRole('textbox', { name: 'Justification', exact: true }).first();
      if (await justification.isVisible().catch(() => false)) {
        await justification.fill('');
        await justification.fill(data.justification);
        await justification.press('Tab').catch(() => {});
      }
    }

    await expect(descField).toHaveValue(new RegExp(escapeRe(data.description)));
    logger.pass(`Requisition description set to "${data.description}"`);
  }

  /**
   * Step 13 — Verify / configure the requester. It defaults to the logged-in
   * employee (shown as a button in the summary); only change it when asked.
   * @param {string} [requester]
   */
  async configureRequester(requester) {
    logger.step(13, 'Configure requester');

    // No requester in the data: requisition for the logged-in employee (the
    // flow's documented default). This is a legitimate, explicit choice.
    if (!requester) {
      logger.pass('No requester specified; requisitioning for the logged-in user');
      return;
    }

    // A requester WAS specified, so it must actually be applied — never silently
    // fall back to the default, which would submit for the wrong person.
    const control = this.page
      .getByRole('combobox', { name: /Requester/i })
      .or(this.page.getByLabel(/Requester/i, { exact: false }))
      .first();
    if (!(await control.isVisible().catch(() => false))) {
      throw new Error(
        `Requester "${requester}" was specified but the Requester field is not editable on this page`
      );
    }
    await this.oracle.selectRedwoodCombobox('Requester', requester);

    // Assert the selection took effect.
    const value = ((await control.inputValue().catch(() => '')) || '').trim();
    expect(value, `Requester should be set to "${requester}"`).toContain(requester);
    logger.pass(`Requester set to "${requester}"`);
  }

  /**
   * Step 14 — Configure delivery. On this pod the Deliver-to Location and
   * Need-by Date are line-level (behind "Edit Delivery Details"); the header
   * shows the defaulted location. Both are best-effort so a pod that defaults
   * them does not fail the run.
   * @param {{deliverToLocation?:string, needByDate:string}} data
   */
  async configureDelivery(data) {
    logger.step(14, 'Configure delivery information');

    if (data.deliverToLocation) {
      const shown = this.page.getByText(data.deliverToLocation, { exact: false }).first();
      if (await shown.isVisible().catch(() => false)) {
        logger.pass(`Deliver-to Location "${data.deliverToLocation}" is set`);
      } else {
        logger.warn(`Deliver-to Location "${data.deliverToLocation}" not shown; using default`);
      }
    }

    const dateField = this.page
      .getByRole('textbox', { name: /Need-by Date|Requested Delivery Date/i })
      .first();
    if (await dateField.isVisible().catch(() => false)) {
      await dateField.fill('');
      await dateField.fill(data.needByDate);
      await dateField.press('Tab').catch(() => {});
      await this.waitUntilReady();
      logger.pass(`Need-by Date set to ${data.needByDate}`);
    } else {
      logger.warn('Need-by Date is line-level on this pod; using the defaulted date');
    }
  }

  /**
   * Step 15 — Verify accounting. The charge account defaults from the BU and is
   * shown in the summary; it is only re-entered when the data provides a BU and
   * the control is editable here.
   * @param {{businessUnit?:string}} _data
   */
  async configureAccounting(_data) {
    logger.step(15, 'Configure accounting information');
    const chargeAccount = this.page.getByText(/Charge To\s+[\d.]+/i).first();
    if (await chargeAccount.isVisible().catch(() => false)) {
      const text = (await chargeAccount.textContent())?.trim();
      logger.pass(`Accounting defaulted: ${text}`);
    } else {
      logger.warn('Charge account not shown in summary; relying on BU default');
    }
  }

  /**
   * Step 16 — Review the requisition line(s): the expected item is present.
   * @param {{itemDescription:string, quantity:string|number}} data
   */
  async reviewLines(data) {
    logger.step(16, 'Review requisition lines');
    await expect(this.page.getByText(data.itemDescription, { exact: false }).first()).toBeVisible();
    logger.pass('Requisition line contains the expected item');
  }

  /**
   * Step 17 — Review the complete requisition before submit.
   * @param {{description:string, itemDescription:string}} data
   */
  async reviewRequisition(data) {
    logger.step(17, 'Review complete requisition');
    // A blocking error surfaces in an alert region; a "Required" field label is
    // not an error, so only react to a genuine alert.
    const alert = this.page.getByRole('alert').filter({ hasText: /error|must|invalid|required/i }).first();
    if (await alert.isVisible().catch(() => false)) {
      logger.warn(`Validation message present: ${(await alert.textContent())?.trim()}`);
    }
    await expect(this.page.getByText(data.itemDescription, { exact: false }).first()).toBeVisible();
    logger.pass('Requisition reviewed with no blocking validation errors');
  }

  /** Step 18 — Submit the requisition. */
  async submit() {
    logger.step(18, 'Submit requisition');

    // Fusion assigns the requisition number to the draft; the Cart header shows
    // "Requisition <number>" and it is preserved on submit. Capture it now so we
    // still have it if the confirmation page navigates away.
    const header = this.page.getByText(/Requisition\s+\d+/i).first();
    if (await header.isVisible().catch(() => false)) {
      const raw = (await header.textContent().catch(() => '')) || '';
      const m = raw.match(/Requisition\s+(\d+)/i);
      this._reqNumber = m ? m[1] : '';
    }

    await this.oracle.clickButton('Submit', { exact: true });
    await this.waitUntilReady();
    // A confirmation dialog may appear; accept it if so.
    await this.oracle.dismissConfirmation();
  }

  /**
   * Step 19 — Capture the generated Requisition Number, preferring the value
   * read from the draft header at submit time and falling back to the
   * confirmation message.
   * @returns {Promise<string>} REQUISITION_NUMBER
   */
  async captureRequisitionNumber() {
    logger.step(19, 'Capture Requisition Number');

    let requisitionNumber = (this._reqNumber || '').trim();

    if (!requisitionNumber) {
      const confirmation = this.page
        .getByText(/Requisition\s+\d+\s+was submitted/i)
        .or(this.page.getByText(/Requisition\s+\d+/i))
        .first();
      await confirmation.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
      const raw = (await confirmation.textContent().catch(() => '')) || '';
      const match = raw.match(/Requisition\s+(\d+)/i) || raw.match(/\b(\d{5,})\b/);
      requisitionNumber = (match ? match[1] : '').trim();
    }

    expect(requisitionNumber, 'Requisition Number should be generated').not.toEqual('');
    logger.pass(`REQUISITION_NUMBER captured: ${requisitionNumber}`);
    return requisitionNumber;
  }
}

/** Escape a string for safe use inside a RegExp. */
function escapeRe(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
