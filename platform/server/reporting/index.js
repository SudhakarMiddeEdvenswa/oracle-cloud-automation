import fs from 'fs';
import path from 'path';

import { buildHtmlReport } from './htmlReport.js';
import { buildCsvReport } from './csvReport.js';
import { buildXlsxReport } from './xlsxReport.js';

/** File name (without extension) used for every report of a run. */
const BASE_NAME = 'report';

/** Formats the platform can emit. */
export const REPORT_FORMATS = ['html', 'csv', 'xlsx'];

/**
 * Write the requested report formats for a finished run.
 *
 * @param {object} run - the run record (see RunManager)
 * @param {string} runDir - the run's folder
 * @param {string[]} formats - any of html | csv | xlsx
 * @returns {Promise<Array<{format:string, file:string, bytes:number}>>}
 */
export async function writeReports(run, runDir, formats) {
  const wanted = (formats || []).map((f) => String(f).toLowerCase()).filter((f) => REPORT_FORMATS.includes(f));
  const unique = [...new Set(wanted)];
  const written = [];

  for (const format of unique) {
    const file = path.join(runDir, `${BASE_NAME}.${format}`);
    if (format === 'html') {
      fs.writeFileSync(file, buildHtmlReport(run), 'utf-8');
    } else if (format === 'csv') {
      fs.writeFileSync(file, buildCsvReport(run), 'utf-8');
    } else if (format === 'xlsx') {
      await buildXlsxReport(run, file);
    }
    written.push({ format, file: path.basename(file), bytes: fs.statSync(file).size });
  }

  return written;
}
