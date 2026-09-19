import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// …/platform/server/routes -> project root -> testdata
export const TESTDATA_DIR = path.resolve(HERE, '..', '..', '..', 'testdata');

/**
 * Resolve a requested testdata file name to an absolute path inside the testdata
 * folder, rejecting anything that escapes it (path traversal) or is not a CSV.
 * @param {string} name
 * @returns {string} absolute path
 */
export function resolveTestDataFile(name) {
  const base = path.basename(String(name || '')); // strip any directory parts
  if (!base || !/\.csv$/i.test(base)) {
    const err = new Error(`"${name}" is not a valid testdata CSV file`);
    err.status = 400;
    throw err;
  }
  const file = path.resolve(TESTDATA_DIR, base);
  if (!file.startsWith(path.resolve(TESTDATA_DIR) + path.sep) || !fs.existsSync(file)) {
    const err = new Error(`Testdata file "${base}" not found`);
    err.status = 404;
    throw err;
  }
  return file;
}

/**
 * Testdata catalogue: the CSV files that live in the project's testdata folder,
 * so the UI can offer them for selection instead of requiring an upload.
 * @returns {import('express').Router}
 */
export function testdataRouter() {
  const router = express.Router();

  // List the available testdata CSV files.
  router.get('/', (req, res, next) => {
    try {
      const files = fs.existsSync(TESTDATA_DIR)
        ? fs
            .readdirSync(TESTDATA_DIR)
            .filter((f) => /\.csv$/i.test(f))
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
              const stat = fs.statSync(path.join(TESTDATA_DIR, name));
              return { name, size: stat.size };
            })
        : [];
      res.json({ files });
    } catch (err) {
      next(err);
    }
  });

  // Return the raw contents of one testdata CSV (used for the data preview).
  router.get('/:name', (req, res, next) => {
    try {
      const file = resolveTestDataFile(req.params.name);
      res.type('text/csv').send(fs.readFileSync(file, 'utf-8'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
