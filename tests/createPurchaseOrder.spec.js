import { test, expect } from '@playwright/test';

import { LoginPage } from '../src/pages/LoginPage.js';
import { HomePage } from '../src/pages/HomePage.js';
import { PurchaseOrdersPage } from '../src/pages/PurchaseOrdersPage.js';
import { PurchaseOrderPage } from '../src/pages/PurchaseOrderPage.js';

import { getPurchaseOrderTestDataRows } from '../src/utils/testDataReader.js';
import { uniquePurchaseOrderDescription, futureDate } from '../src/utils/dataGenerator.js';
import { env } from '../src/utils/env.js';
import { logger } from '../src/utils/logger.js';

/**
 * End-to-end: Create a New Purchase Order in Oracle Cloud Procurement.
 * Implements the 23-step flow described in
 * Create_New_Purchase_Order_Automation_prompt.md.
 *
 * One row of testdata/Purchase_Order_Data.csv is one test case. The column
 * contract matches the create-purchase-order flow.json, so the same CSV drives
 * both this standalone spec and the web UI app's specs dropdown. The PO
 * description gets a per-run timestamp appended so re-runs never collide,
 * e.g. "AUTO_TEST_PO_20260918023615".
 */
const purchaseOrderRows = getPurchaseOrderTestDataRows();

test.describe('Oracle Cloud — Create New Purchase Order (E2E)', () => {
  purchaseOrderRows.forEach((data, rowIndex) => {
    test(`creates a purchase order and validates it end-to-end [row ${rowIndex + 1}]`, async ({ page }) => {
      // Runtime variables generated/captured during the run (unique per execution).
      const description =
        uniquePurchaseOrderDescription(data.descriptionPrefix) +
        (purchaseOrderRows.length > 1 ? `_R${rowIndex + 1}` : '');
      // "AUTO" (or a blank cell) means: generate a valid future need-by date.
      const needByDate = /^auto$/i.test(data.needByDate) || !data.needByDate
        ? futureDate(7)
        : data.needByDate;
      let PO_NUMBER = '';

      logger.info(`Generated PO description: ${description}`);
      logger.info(`Need-by date: ${needByDate}`);

      // --- Page objects -------------------------------------------------
      const loginPage = new LoginPage(page);
      const homePage = new HomePage(page);
      const purchaseOrdersPage = new PurchaseOrdersPage(page);
      const purchaseOrderPage = new PurchaseOrderPage(page);

      // --- Step 1: Login ------------------------------------------------
      await loginPage.open();
      await loginPage.login(env.username, env.password);
      await homePage.verifyLoaded();

      // --- Steps 2-4: Navigate to Purchase Orders -----------------------
      await homePage.openNavigator();
      await homePage.goToProcurement();
      await homePage.goToPurchaseOrders();

      // --- Step 5: Start purchase order creation ------------------------
      await purchaseOrdersPage.startCreateOrder();

      // --- Steps 6-10: PO header ----------------------------------------
      await purchaseOrderPage.completeCreateOrderDialog({
        businessUnit: data.businessUnit,
        supplier: data.supplier,
        supplierSite: data.supplierSite,
      });
      await purchaseOrderPage.enterHeader({
        businessUnit: data.businessUnit,
        supplier: data.supplier,
        supplierSite: data.supplierSite,
        buyer: data.buyer,
        currency: data.currency,
        description,
      });

      // --- Steps 11-13: PO line -----------------------------------------
      await purchaseOrderPage.addLine({
        lineType: data.lineType,
        itemDescription: data.itemDescription,
        category: data.category,
        quantity: data.quantity,
        uom: data.uom,
        price: data.price,
      });

      // --- Steps 14-16: Schedule ----------------------------------------
      await purchaseOrderPage.configureSchedule({
        needByDate,
        shipToOrganization: data.shipToOrganization,
        shipToLocation: data.shipToLocation,
      });

      // --- Steps 17-18: Distribution ------------------------------------
      await purchaseOrderPage.configureDistribution({ chargeAccount: data.chargeAccount });

      // --- Step 19: Review ----------------------------------------------
      await purchaseOrderPage.reviewPO({ itemDescription: data.itemDescription, description });

      // --- Steps 20-21: Submit and capture the PO number ----------------
      PO_NUMBER = await purchaseOrderPage.submitAndCapturePONumber();
      expect(PO_NUMBER).not.toEqual('');

      // --- Step 22: Search and reopen the submitted PO ------------------
      const onPurchaseOrdersWorkArea = await page
        .getByRole('link', { name: /Manage Orders|More Tasks|^Tasks$/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (!onPurchaseOrdersWorkArea) {
        await homePage.openNavigator();
        await homePage.goToProcurement();
        await homePage.goToPurchaseOrders();
      }
      await purchaseOrdersPage.searchAndOpen(PO_NUMBER);

      // --- Step 23: Final end-to-end validation -------------------------
      await purchaseOrdersPage.validatePurchaseOrder({
        orderNumber: PO_NUMBER,
        description,
        supplier: data.supplier,
        supplierSite: data.supplierSite,
        itemDescription: data.itemDescription,
        quantity: data.quantity,
        shipToLocation: data.shipToLocation,
      });

      logger.pass(`TEST PASS — Purchase Order "${description}" (#${PO_NUMBER}) validated`);
    });
  });
});
