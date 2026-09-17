import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env before the config is evaluated.
dotenv.config();

const HEADLESS = String(process.env.HEADLESS).toLowerCase() !== 'false';
const BROWSER = (process.env.BROWSER || 'chromium').toLowerCase();
const DEFAULT_TIMEOUT = Number(process.env.DEFAULT_TIMEOUT) || 60000;
const SLOW_MO = Number(process.env.SLOW_MO) || 0;

/**
 * Playwright configuration for the Oracle Cloud SaaS supplier automation.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // Oracle Fusion flows are long; give each test generous time.
  timeout: 15 * 60 * 1000,
  expect: {
    timeout: DEFAULT_TIMEOUT,
  },
  // The supplier flow is stateful end-to-end; do not parallelize within a file.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.ORACLE_BASE_URL,
    headless: HEADLESS,
    actionTimeout: DEFAULT_TIMEOUT,
    navigationTimeout: DEFAULT_TIMEOUT,
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: SLOW_MO,
    },
  },

  projects: [
    {
      name: BROWSER,
      use: { ...devices[browserDeviceName(BROWSER)] },
    },
  ],
});

/** Map a browser name to the matching Playwright device descriptor. */
function browserDeviceName(browser) {
  switch (browser) {
    case 'firefox':
      return 'Desktop Firefox';
    case 'webkit':
      return 'Desktop Safari';
    case 'chromium':
    default:
      return 'Desktop Chrome';
  }
}
