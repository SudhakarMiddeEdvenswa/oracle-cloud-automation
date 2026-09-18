import { OracleFusionHelper } from '../page-helpers/OracleFusionHelper.js';

/**
 * Base class for all page objects.
 * Provides the shared Playwright page and the Oracle Fusion helper.
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {{baseUrl?:string, username?:string, password?:string, procurementBusinessUnit?:string}} [config]
   *   Per-run instance details supplied by the platform. When omitted, page
   *   objects fall back to the .env values so the standalone Playwright specs
   *   keep working unchanged.
   */
  constructor(page, config = null) {
    this.page = page;
    this.config = config;
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
