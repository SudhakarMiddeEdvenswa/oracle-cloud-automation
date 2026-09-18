import { LoginPage } from '../../src/pages/LoginPage.js';
import { HomePage } from '../../src/pages/HomePage.js';
import { SuppliersPage } from '../../src/pages/SuppliersPage.js';
import { CreateSupplierPage } from '../../src/pages/CreateSupplierPage.js';
import { SupplierProfilePage } from '../../src/pages/SupplierProfilePage.js';
import { AddressPage } from '../../src/pages/AddressPage.js';
import { SitePage } from '../../src/pages/SitePage.js';
import { ContactPage } from '../../src/pages/ContactPage.js';

/**
 * Deterministic implementation of the Create Supplier flow.
 *
 * Every key below is a step id from steps.txt. The platform prefers these
 * implementations; any step id that is missing here — or whose implementation
 * throws because the application UI moved — is completed by the AI agent from
 * the prose in steps.txt instead.
 *
 * @param {import('../../src/core/FlowContext.js').FlowContext} ctx
 * @returns {Record<string, (ctx: object) => Promise<void>>}
 */
export function buildSteps(ctx) {
  const { page, row } = ctx;
  const data = row.data;

  // Per-run instance details, so the page objects never read .env directly.
  const config = {
    baseUrl: ctx.instance.baseUrl,
    username: ctx.instance.username,
    password: ctx.instance.password,
    procurementBusinessUnit: data.procurementBusinessUnit || '',
    defaultTimeout: ctx.settings.defaultTimeout,
  };

  const loginPage = new LoginPage(page, config);
  const homePage = new HomePage(page, config);
  const suppliersPage = new SuppliersPage(page, config);
  const createSupplierPage = new CreateSupplierPage(page, config);
  const profilePage = new SupplierProfilePage(page, config);
  const addressPage = new AddressPage(page, config);
  const sitePage = new SitePage(page, config);
  const contactPage = new ContactPage(page, config);

  return {
    login: async () => {
      await loginPage.open();
      await loginPage.login(config.username, config.password);
      await homePage.verifyLoaded();
    },

    'open-suppliers': async () => {
      await homePage.openNavigator();
      await homePage.goToProcurement();
      await homePage.goToSuppliers();
    },

    'create-supplier': async () => {
      await suppliersPage.startCreateSupplier();
      await createSupplierPage.enterSupplierInfo({
        name: data.supplierName,
        businessRelationship: data.businessRelationship,
        taxOrganizationType: data.taxOrganizationType,
        taxCountry: data.taxCountry,
        taxRegistrationNumber: data.taxRegistrationNumber,
      });
    },

    'capture-supplier-number': async () => {
      const supplierNumber = await createSupplierPage.captureSupplierNumber();
      ctx.capture('supplierNumber', supplierNumber);
    },

    'organization-details': async () => {
      await profilePage.setSupplierType(data.supplierType);
    },

    'create-address': async () => {
      await profilePage.openTab('Addresses');
      await addressPage.startCreateAddress();
      await addressPage.enterAddress({
        addressName: data.addressName,
        country: data.addressCountry,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
      });
      await addressPage.setPurposesAndSave(asList(data.addressPurposes));
      await addressPage.expectAddressListed(data.addressName);
    },

    'create-site': async () => {
      await profilePage.openTab('Sites');
      await sitePage.startCreateSite();
      await sitePage.enterSiteInfo({
        siteName: data.siteName,
        address: data.addressName,
        sitePurposes: asList(data.sitePurposes),
        procurementBusinessUnit: data.procurementBusinessUnit || '',
      });
      await sitePage.configureReceiving(data.receiptRouting);
      await sitePage.configureSiteAssignments();
      await sitePage.saveSite();
      await sitePage.expectSiteListed(data.siteName);
    },

    'create-contact': async () => {
      await profilePage.openTab('Contacts');
      await contactPage.startCreateContact();
      await contactPage.createContact(
        {
          firstName: data.contactFirstName,
          lastName: data.contactLastName,
          email: data.contactEmail,
          administrativeContact: data.administrativeContact === true,
        },
        data.addressName
      );
      await contactPage.expectContactListed({
        firstName: data.contactFirstName,
        lastName: data.contactLastName,
        email: data.contactEmail,
      });
    },

    'save-supplier': async () => {
      await profilePage.saveAll();
    },

    'reopen-supplier': async () => {
      // "Save and Close" normally lands back on the Suppliers work area; only
      // re-navigate through the Navigator when it does not.
      const onSuppliersWorkArea = await page
        .getByRole('link', { name: /^Tasks$/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (!onSuppliersWorkArea) {
        await homePage.openNavigator();
        await homePage.goToProcurement();
        await homePage.goToSuppliers();
      }
      await suppliersPage.searchAndOpen(ctx.captured.supplierNumber ?? '', data.supplierName);
    },
  };
}

/** Accept a list field whether it arrived as an array or a pipe-separated string. */
function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? '')
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

export default { buildSteps };
