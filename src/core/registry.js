import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

import { parseStepsFile } from './stepsFile.js';
import { parseVerifyFile } from './verify.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REGISTRY_DIR = path.resolve(HERE, '..', '..', 'registry');

/**
 * The flow registry — the platform's equivalent of the spec sheet.
 *
 * One folder per business flow ("Form/Function Name"):
 *
 *   registry/create-supplier/
 *     flow.json           manifest: name, module, CSV field contract
 *     steps.txt           Detailed Steps        (what the flow does)
 *     verify.txt          Verification File     (how success is judged)
 *     data.template.csv   Data File template    (optional; generated if absent)
 *     flow.js             deterministic Playwright implementation (optional)
 *
 * Dropping a new folder in is all it takes to add a flow to the UI dropdown —
 * no platform code changes. Flows without a `flow.js` are executed by the AI
 * agent directly from `steps.txt`.
 */

/** @returns {Array<object>} every flow manifest, sorted by the order field then name. */
export function listFlows() {
  if (!fs.existsSync(REGISTRY_DIR)) return [];
  const flows = [];
  for (const entry of fs.readdirSync(REGISTRY_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      flows.push(loadFlow(entry.name));
    } catch (err) {
      // A malformed folder must not take the whole platform down.
      flows.push({
        id: entry.name,
        name: entry.name,
        broken: true,
        error: err instanceof Error ? err.message : String(err),
        fields: [],
        steps: [],
        rules: [],
      });
    }
  }
  return flows.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

/**
 * Load one flow by folder id.
 * @param {string} id
 * @returns {object}
 */
export function loadFlow(id) {
  const dir = flowDir(id);
  const manifestPath = path.join(dir, 'flow.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Flow "${id}" has no flow.json manifest`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const stepsPath = path.join(dir, manifest.stepsFile || 'steps.txt');
  const verifyPath = path.join(dir, manifest.verifyFile || 'verify.txt');
  const specPath = path.join(dir, manifest.specFile || 'flow.js');
  const templatePath = path.join(dir, manifest.dataTemplate || 'data.template.csv');

  const stepsText = readIfExists(stepsPath);
  const verifyText = readIfExists(verifyPath);
  const steps = parseStepsFile(stepsText);

  if (!steps.length) {
    throw new Error(`Flow "${id}" has no parseable steps in ${path.basename(stepsPath)}`);
  }

  return {
    id: manifest.id || id,
    dir,
    name: manifest.name || id,
    module: manifest.module || 'General',
    description: manifest.description || '',
    order: manifest.order,
    fields: manifest.fields || [],
    captures: manifest.captures || [],
    engine: fs.existsSync(specPath) ? 'hybrid' : 'ai',
    specPath: fs.existsSync(specPath) ? specPath : null,
    stepsPath,
    verifyPath: fs.existsSync(verifyPath) ? verifyPath : null,
    templatePath: fs.existsSync(templatePath) ? templatePath : null,
    stepsText,
    verifyText,
    steps,
    rules: parseVerifyFile(verifyText),
    broken: false,
  };
}

/**
 * Dynamically import a flow's deterministic implementation, if it has one.
 * @param {object} flow
 * @returns {Promise<null | {buildSteps: Function}>}
 */
export async function loadFlowSpec(flow) {
  if (!flow.specPath) return null;
  const mod = await import(pathToFileURL(flow.specPath).href);
  const spec = mod.default ?? mod;
  if (typeof spec.buildSteps !== 'function') {
    throw new Error(`Flow "${flow.id}" spec must export buildSteps(ctx)`);
  }
  return spec;
}

function flowDir(id) {
  // Guard against path traversal from an API-supplied id.
  const safe = String(id ?? '').replace(/[^a-z0-9_-]/gi, '');
  if (!safe) throw new Error('Invalid flow id');
  const dir = path.join(REGISTRY_DIR, safe);
  if (!fs.existsSync(dir)) throw new Error(`Unknown flow "${safe}"`);
  return dir;
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}
