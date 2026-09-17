import { OracleFusionHelper } from '../page-helpers/OracleFusionHelper.js';

/**
 * Base class for all page objects.
 * Provides the shared Playwright page and the Oracle Fusion helper.
 */
export class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.oracle = new OracleFusionHelper(page);
  }

  /** @returns {Promise<string>} current page URL */
  async currentUrl() {
    return this.page.url();
  }

  /** Wait for Oracle background processing / spinners to settle. */
  async waitUntilReady() {
    await this.oracle.waitForLoading();
  }
}
