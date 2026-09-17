import { test, expect } from '@playwright/test';

import { LoginPage } from '../src/pages/LoginPage.js';
import { HomePage } from '../src/pages/HomePage.js';
import { SuppliersPage } from '../src/pages/SuppliersPage.js';
import { CreateSupplierPage } from '../src/pages/CreateSupplierPage.js';
import { SupplierProfilePage } from '../src/pages/SupplierProfilePage.js';
import { AddressPage } from '../src/pages/AddressPage.js';
import { SitePage } from '../src/pages/SitePage.js';
import { ContactPage } from '../src/pages/ContactPage.js';

import { getSupplierTestData } from '../src/utils/testDataReader.js';
import { uniqueSupplierName } from '../src/utils/dataGenerator.js';
import { env } from '../src/utils/env.js';
import { logger } from '../src/utils/logger.js';

/**
 * End-to-end: Create a New Supplier in Oracle Cloud SaaS (Procurement).
 * Implements the 21-step flow described in
 * Create_New_Supplier_AI_Automation_prompt.md.
 */
test.describe('Oracle Cloud — Create New Supplier (E2E)', () => {
  test('creates a supplier and validates it end-to-end', async ({ page }) => {
    const data = getSupplierTestData();

    // Runtime variables captured during the run.
    const supplierName = uniqueSupplierName(data.supplier.namePrefix);
    let SUPPLIER_NUMBER = '';
    const contactFullName = `${data.contact.firstName} ${data.contact.lastName}`;

    logger.info(`Generated supplier name: ${supplierName}`);

    // --- Page objects ---------------------------------------------------
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);
    const suppliersPage = new SuppliersPage(page);
    const createSupplierPage = new CreateSupplierPage(page);
    const profilePage = new SupplierProfilePage(page);
    const addressPage = new AddressPage(page);
    const sitePage = new SitePage(page);
    const contactPage = new ContactPage(page);

    // --- Step 1: Login --------------------------------------------------
    await loginPage.open();
    await loginPage.login(env.username, env.password);
    await homePage.verifyLoaded();

    // --- Steps 2-4: Navigate to Suppliers -------------------------------
    await homePage.openNavigator();
    await homePage.goToProcurement();
    await homePage.goToSuppliers();

    // --- Step 5: Start supplier creation --------------------------------
    await suppliersPage.startCreateSupplier();

    // --- Step 6: Enter supplier information -----------------------------
    await createSupplierPage.enterSupplierInfo({
      name: supplierName,
      businessRelationship: data.supplier.businessRelationship,
      taxOrganizationType: data.supplier.taxOrganizationType,
      taxCountry: data.supplier.taxCountry,
      taxRegistrationNumber: data.supplier.taxRegistrationNumber,
    });

    // --- Step 7: Capture Supplier Number --------------------------------
    SUPPLIER_NUMBER = await createSupplierPage.captureSupplierNumber();
    expect(SUPPLIER_NUMBER).not.toEqual('');

    // --- Step 8: Validate / set organization details --------------------
    await profilePage.setSupplierType(data.supplier.supplierType);

    // --- Steps 9-11: Addresses ------------------------------------------
    await profilePage.openTab('Addresses');
    await addressPage.startCreateAddress();
    await addressPage.enterAddress(data.address);
    await addressPage.setPurposesAndSave(data.address.purposes);
    await addressPage.expectAddressListed(data.address.addressName);

    // --- Steps 12-16: Sites ---------------------------------------------
    await profilePage.openTab('Sites');
    await sitePage.startCreateSite();
    await sitePage.enterSiteInfo(data.site);
    await sitePage.configureReceiving(data.site.receiptRouting);
    await sitePage.configureSiteAssignments();
    await sitePage.saveSite();
    await sitePage.expectSiteListed(data.site.siteName);

    // --- Steps 17-18: Contacts ------------------------------------------
    await profilePage.openTab('Contacts');
    await contactPage.startCreateContact();
    await contactPage.createContact(data.contact, data.address.addressName);
    await contactPage.expectContactListed(contactFullName);

    // --- Step 19: Save the complete supplier ----------------------------
    await profilePage.saveAll();

    // --- Step 20: Search and reopen supplier ----------------------------
    await homePage.openNavigator();
    await homePage.goToProcurement();
    await homePage.goToSuppliers();
    await suppliersPage.searchAndOpen(SUPPLIER_NUMBER, supplierName);

    // --- Step 21: Final end-to-end validation ---------------------------
    logger.step(21, 'Perform final end-to-end validation');
    await profilePage.openTab('Profile');
    await profilePage.validateField('Supplier', supplierName);
    await profilePage.validateField('Supplier Number', SUPPLIER_NUMBER);
    await profilePage.validateField('Supplier Type', data.supplier.supplierType);

    await profilePage.openTab('Addresses');
    await addressPage.expectAddressListed(data.address.addressName);

    await profilePage.openTab('Sites');
    await sitePage.expectSiteListed(data.site.siteName);

    await profilePage.openTab('Contacts');
    await contactPage.expectContactListed(contactFullName);

    logger.pass(`TEST PASS — Supplier "${supplierName}" (#${SUPPLIER_NUMBER}) validated`);
  });
});
