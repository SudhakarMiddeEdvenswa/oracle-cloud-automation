import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the project-level testdata directory (…/OracleCloud/testdata).
const TESTDATA_DIR = path.resolve(__dirname, '..', '..', 'testdata');

/**
 * Read and parse a JSON test-data file from the testdata folder.
 * @param {string} fileName - e.g. "supplierData.json"
 * @returns {object} Parsed JSON content.
 */
export function readTestData(fileName) {
  const filePath = path.join(TESTDATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse test data file "${fileName}": ${err.message}`);
  }
}

/**
 * Convenience loader for the supplier test data used by the create-supplier flow.
 * @returns {object}
 */
export function getSupplierTestData() {
  return readTestData('supplierData.json');
}
