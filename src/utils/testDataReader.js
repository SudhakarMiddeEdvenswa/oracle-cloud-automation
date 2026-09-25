import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseCsv, indexRow } from '../core/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the project-level testdata directory (…/OracleCloud/testdata).
const TESTDATA_DIR = path.resolve(__dirname, '..', '..', 'testdata');

/** Truthy interpretation of CSV boolean-ish cells ("Yes", "true", "1"). */
function toBool(value) {
  return /^(yes|true|y|1)$/i.test(String(value ?? '').trim());
}

/**
 * Map one indexed CSV row to the nested supplier structure the page objects and
 * the create-supplier spec consume (the same shape as supplierData.json).
 *
 * `supplierName` from the CSV is exposed as `supplier.namePrefix`, so the spec
 * can append a per-run timestamp (e.g. "AUTO_TEST_SUPPLIER_20260918023615") and
 * avoid the "duplicate supplier name" failure Oracle raises on re-runs.
 *
 * @param {Map<string,string>} row - normalized-key accessor from indexRow()
 * @returns {object}
 */
function mapSupplierRow(row) {
  const get = (key) => row.get(key) ?? '';
  const purposes = get('addresspurposes')
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    supplier: {
      namePrefix: get('suppliername'),
      businessRelationship: get('businessrelationship'),
      taxOrganizationType: get('taxorganizationtype'),
      taxCountry: get('taxcountry'),
      taxRegistrationNumber: get('taxregistrationnumber'),
      supplierType: get('suppliertype'),
    },
    address: {
      addressName: get('addressname'),
      country: get('addresscountry'),
      addressLine1: get('addressline1'),
      city: get('city'),
      state: get('state'),
      postalCode: get('postalcode'),
      purposes,
    },
    site: {
      siteName: get('sitename'),
      address: get('siteaddress') || get('addressname'),
      receiptRouting: get('receiptrouting'),
    },
    contact: {
      firstName: get('contactfirstname'),
      lastName: get('contactlastname'),
      email: get('contactemail'),
      administrativeContact: toBool(get('administrativecontact')),
    },
  };
}

/**
 * Read and parse a CSV file from the testdata folder into indexed rows.
 * @param {string} fileName
 * @returns {Array<Map<string,string>>} normalized-key accessor per row
 */
function readCsvRows(fileName) {
  const filePath = path.join(TESTDATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`);
  }
  const { rows, errors } = parseCsv(fs.readFileSync(filePath, 'utf-8'));
  if (errors.length) {
    throw new Error(`Failed to parse "${fileName}": ${errors.join('; ')}`);
  }
  if (!rows.length) {
    throw new Error(`No test data rows found in "${fileName}"`);
  }
  return rows.map((raw) => indexRow(raw));
}

/**
 * Read supplier test cases from a CSV file in the testdata folder. Every
 * non-empty row is one test case.
 * @param {string} [fileName="supplierData.csv"]
 * @returns {object[]} array of nested supplier data objects
 */
export function getSupplierTestDataRows(fileName = 'supplierData.csv') {
  return readCsvRows(fileName).map(mapSupplierRow);
}

/**
 * Map one indexed CSV row to the flat requisition structure the requisition
 * page objects and the create-requisition spec consume. Column names match the
 * create-requisition flow.json contract, so the same file drives the web UI and
 * the standalone spec.
 *
 * `requisitionDescription` is exposed as `descriptionPrefix`, so the spec can
 * append a per-run timestamp (e.g. "AUTO_TEST_REQ_20260918023615").
 *
 * @param {Map<string,string>} row - normalized-key accessor from indexRow()
 * @returns {object}
 */
function mapRequisitionRow(row) {
  const get = (key) => row.get(key) ?? '';
  return {
    descriptionPrefix: get('requisitiondescription') || 'AUTO_TEST_REQ',
    businessUnit: get('businessunit'),
    requester: get('requester'),
    itemDescription: get('itemdescription'),
    category: get('category'),
    quantity: get('quantity') || '1',
    uom: get('uom'),
    price: get('price'),
    currency: get('currency') || 'USD',
    // "AUTO" (or blank) means: generate a valid future date at run time.
    needByDate: get('needbydate'),
    deliverToLocation: get('delivertolocation'),
    supplier: get('supplier'),
    supplierSite: get('suppliersite'),
    justification: get('justification'),
  };
}

/**
 * Read purchase-requisition test cases from a CSV file in the testdata folder.
 * Every non-empty row is one test case.
 * @param {string} [fileName="Purchase_Requisition_Data.csv"]
 * @returns {object[]} array of requisition data objects
 */
export function getRequisitionTestDataRows(fileName = 'Purchase_Requisition_Data.csv') {
  return readCsvRows(fileName).map(mapRequisitionRow);
}

/**
 * Map one indexed CSV row to the flat purchase-order structure the PO page
 * objects and the create-purchase-order spec consume. Column names match the
 * create-purchase-order flow.json contract, so the same file drives the web UI
 * app (specs dropdown) and the standalone Playwright spec.
 *
 * `description` is exposed as `descriptionPrefix`, so the spec can append a
 * per-run timestamp (e.g. "AUTO_TEST_PO_20260918023615") and avoid colliding
 * with a previous run's header.
 *
 * @param {Map<string,string>} row - normalized-key accessor from indexRow()
 * @returns {object}
 */
function mapPurchaseOrderRow(row) {
  const get = (key) => row.get(key) ?? '';
  return {
    descriptionPrefix: get('description') || 'AUTO_TEST_PO',
    businessUnit: get('businessunit'),
    supplier: get('supplier'),
    supplierSite: get('suppliersite'),
    buyer: get('buyer'),
    currency: get('currency') || 'USD',
    lineType: get('linetype') || 'Goods',
    itemDescription: get('itemdescription'),
    category: get('category'),
    quantity: get('quantity') || '1',
    uom: get('uom'),
    price: get('price'),
    // "AUTO" (or blank) means: generate a valid future date at run time.
    needByDate: get('needbydate'),
    shipToOrganization: get('shiptoorganization'),
    shipToLocation: get('shiptolocation'),
    chargeAccount: get('chargeaccount'),
    billToLocation: get('billtolocation'),
    paymentTerms: get('paymentterms'),
  };
}

/**
 * Read purchase-order test cases from a CSV file in the testdata folder. Every
 * non-empty row is one test case.
 * @param {string} [fileName="Purchase_Order_Data.csv"]
 * @returns {object[]} array of purchase-order data objects
 */
export function getPurchaseOrderTestDataRows(fileName = 'Purchase_Order_Data.csv') {
  return readCsvRows(fileName).map(mapPurchaseOrderRow);
}
