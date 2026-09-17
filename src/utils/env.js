import dotenv from 'dotenv';

// Ensure environment variables are loaded whenever this module is imported.
dotenv.config();

/**
 * Read a required environment variable, throwing a clear error if it is missing.
 * @param {string} key
 * @returns {string}
 */
function required(key) {
  const value = process.env[key];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        `Copy .env.example to .env and set a value.`
    );
  }
  return value;
}

/**
 * Read an optional environment variable with a fallback default.
 * @param {string} key
 * @param {string} [fallback='']
 * @returns {string}
 */
function optional(key, fallback = '') {
  const value = process.env[key];
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : value;
}

/** Centralized, validated access to configuration coming from the environment. */
export const env = {
  get baseUrl() {
    return required('ORACLE_BASE_URL');
  },
  get username() {
    return required('ORACLE_USERNAME');
  },
  get password() {
    return required('ORACLE_PASSWORD');
  },
  get procurementBusinessUnit() {
    return optional('PROCUREMENT_BUSINESS_UNIT');
  },
  get defaultTimeout() {
    return Number(optional('DEFAULT_TIMEOUT', '60000'));
  },
};
