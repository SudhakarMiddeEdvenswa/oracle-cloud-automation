import { test, expect } from '@playwright/test';

import { LoginPage } from '../src/pages/LoginPage.js';
import { HomePage } from '../src/pages/HomePage.js';
import { RequisitionsPage } from '../src/pages/RequisitionsPage.js';
import { CreateRequisitionPage } from '../src/pages/CreateRequisitionPage.js';
import { RequisitionCheckoutPage } from '../src/pages/RequisitionCheckoutPage.js';

import { getRequisitionTestDataRows } from '../src/utils/testDataReader.js';
import { uniqueRequisitionDescription, futureDate } from '../src/utils/dataGenerator.js';
import { env } from '../src/utils/env.js';
import { logger } from '../src/utils/logger.js';

/**
 * End-to-end: Create a New Purchase Requisition in Oracle Cloud Procurement.
 * Implements the 21-step flow described in
 * Create_New_Purchase_Requisition_Automation_prompt.md.
 *
 * One row of testdata/Purchase_Requisition_Data.csv is one test case. The
 * requisition description gets a per-run timestamp appended so re-runs never
 * collide, e.g. "AUTO_TEST_REQ_20260918023615".
 */
const requisitionRows = getRequisitionTestDataRows();

test.describe('Oracle Cloud — Create New Purchase Requisition (E2E)', () => {
  requisitionRows.forEach((data, rowIndex) => {
    test(`creates a requisition and validates it end-to-end [row ${rowIndex + 1}]`, async ({ page }) => {
      // Runtime variables generated/captured during the run (unique per execution).
      const description =
        uniqueRequisitionDescription(data.descriptionPrefix) +
        (requisitionRows.length > 1 ? `_R${rowIndex + 1}` : '');
      // "AUTO" (or a blank cell) means: generate a valid future need-by date.
      const needByDate = /^auto$/i.test(data.needByDate) || !data.needByDate
        ? futureDate(7)
        : data.needByDate;
      let REQUISITION_NUMBER = '';

      logger.info(`Generated requisition description: ${description}`);
      logger.info(`Need-by date: ${needByDate}`);

      // --- Page objects -------------------------------------------------
      const loginPage = new LoginPage(page);
      const homePage = new HomePage(page);
      const requisitionsPage = new RequisitionsPage(page);
      const createRequisitionPage = new CreateRequisitionPage(page);
      const checkoutPage = new RequisitionCheckoutPage(page);

      // --- Step 1: Login ------------------------------------------------
      await loginPage.open();
      await loginPage.login(env.username, env.password);
      await homePage.verifyLoaded();

      // --- Steps 2-4: Navigate to Purchase Requisitions -----------------
      await homePage.openNavigator();
      await homePage.goToProcurement();
      await homePage.goToPurchaseRequisitions();

      // --- Step 5: Start requisition creation ---------------------------
      await requisitionsPage.startCreateRequisition();

      // --- Steps 6-11: Noncatalog item → cart → checkout ----------------
      await createRequisitionPage.enterItemDetails({
        itemDescription: data.itemDescription,
        category: data.category,
      });
      await createRequisitionPage.enterQuantityAndPrice({
        quantity: data.quantity,
        uom: data.uom,
        price: data.price,
        currency: data.currency,
      });
      await createRequisitionPage.addToCart();
      await createRequisitionPage.openCart(data.itemDescription);
      await createRequisitionPage.checkout();

      // --- Steps 12-17: Checkout details --------------------------------
      await checkoutPage.enterRequisitionInfo({ description, justification: data.justification });
      await checkoutPage.configureRequester(data.requester);
      await checkoutPage.configureDelivery({
        deliverToLocation: data.deliverToLocation,
        needByDate,
      });
      await checkoutPage.configureAccounting({ businessUnit: data.businessUnit });
      await checkoutPage.reviewLines({ itemDescription: data.itemDescription, quantity: data.quantity });
      await checkoutPage.reviewRequisition({ description, itemDescription: data.itemDescription });

      // --- Steps 18-19: Submit and capture the requisition number -------
      await checkoutPage.submit();
      REQUISITION_NUMBER = await checkoutPage.captureRequisitionNumber();
      expect(REQUISITION_NUMBER).not.toEqual('');

      // --- Step 20: Search and reopen the submitted requisition ---------
      const onRequisitionsWorkArea = await page
        .getByRole('link', { name: /Manage Requisitions|More Tasks|^Tasks$/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (!onRequisitionsWorkArea) {
        await homePage.openNavigator();
        await homePage.goToProcurement();
        await homePage.goToPurchaseRequisitions();
      }
      await requisitionsPage.searchAndOpen(REQUISITION_NUMBER);

      // --- Step 21: Final end-to-end validation -------------------------
      await requisitionsPage.validateRequisition({
        requisitionNumber: REQUISITION_NUMBER,
        description,
        itemDescription: data.itemDescription,
        quantity: data.quantity,
        deliverToLocation: data.deliverToLocation,
      });

      logger.pass(`TEST PASS — Requisition "${description}" (#${REQUISITION_NUMBER}) validated`);
    });
  });
});
