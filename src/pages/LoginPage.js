import { BasePage } from './BasePage.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

/**
 * Step 1 — Login to Oracle Cloud SaaS.
 */
export class LoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    // Oracle Cloud presents different login pages (OCI IAM / IDCS vs classic
    // Fusion SSO). Locate by visible label/role first, then fall back to
    // legacy id/name selectors so the framework works across pods.
    this.usernameInput = page
      .getByRole('textbox', { name: /Username/i })
      .or(page.locator('#userid, input[name="userid"], #username'));
    this.passwordInput = page
      .getByRole('textbox', { name: /Password/i })
      .or(page.locator('#password, input[name="password"]'));
    this.signInButton = page
      .getByRole('button', { name: /^(Next|Sign In|Sign in)$/i })
      .or(page.locator('#btnActive, button[type="submit"], input[type="submit"]'));
  }

  /** Open the Oracle Cloud application URL. */
  async open() {
    logger.step(1, 'Open Oracle Cloud SaaS URL');
    await this.page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });
    await this.waitUntilReady();
  }

  /**
   * Log in with the provided credentials.
   * @param {string} [username]
   * @param {string} [password]
   */
  async login(username = env.username, password = env.password) {
    logger.step(1, `Login as "${username}"`);
    await this.usernameInput.first().waitFor({ state: 'visible' });
    await this.usernameInput.first().fill(username);

    // Single-page login: password field is already present.
    if (await this.passwordInput.first().isVisible().catch(() => false)) {
      await this.passwordInput.first().fill(password);
      await this.signInButton.first().click();
    } else {
      // Two-step login: submit username, then wait for the password page.
      await this.signInButton.first().click();
      await this.passwordInput.first().waitFor({ state: 'visible' });
      await this.passwordInput.first().fill(password);
      await this.signInButton.first().click();
    }
    await this.waitUntilReady();
  }
}
