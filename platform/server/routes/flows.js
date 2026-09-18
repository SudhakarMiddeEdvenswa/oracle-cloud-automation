import fs from 'fs';

import express from 'express';

import { listFlows, loadFlow } from '../../../src/core/registry.js';
import { templateFor } from '../../../src/core/csv.js';

/**
 * Flow catalogue: what the dropdown offers, and each flow's data contract.
 * @returns {import('express').Router}
 */
export function flowsRouter() {
  const router = express.Router();

  // The dropdown: every flow in the registry, with enough detail for the UI to
  // show its module, engine and field count.
  router.get('/', (req, res) => {
    const flows = listFlows().map((flow) => ({
      id: flow.id,
      name: flow.name,
      module: flow.module,
      description: flow.description,
      engine: flow.engine,
      fieldCount: flow.fields.length,
      requiredFields: flow.fields.filter((f) => f.required).map((f) => f.label || f.name),
      stepCount: flow.steps.length,
      ruleCount: flow.rules.length,
      hasTemplate: !!flow.templatePath,
      broken: flow.broken,
      error: flow.error ?? null,
    }));
    res.json({ flows });
  });

  // Everything the UI needs once a flow is selected: fields, steps, rules.
  router.get('/:id', (req, res, next) => {
    try {
      const flow = loadFlow(req.params.id);
      res.json({
        id: flow.id,
        name: flow.name,
        module: flow.module,
        description: flow.description,
        engine: flow.engine,
        fields: flow.fields,
        captures: flow.captures,
        steps: flow.steps.map((s) => ({
          id: s.id,
          title: s.title,
          scope: s.scope,
          optional: s.optional,
          expected: s.expected,
          hasImplementation: hasImplementation(flow, s.id),
        })),
        rules: flow.rules,
        stepsText: flow.stepsText,
        verifyText: flow.verifyText,
        hasTemplate: !!flow.templatePath,
      });
    } catch (err) {
      err.status = 404;
      next(err);
    }
  });

  // Download a ready-to-fill data file for the flow.
  router.get('/:id/template', (req, res, next) => {
    try {
      const flow = loadFlow(req.params.id);
      const csv = flow.templatePath ? fs.readFileSync(flow.templatePath, 'utf-8') : templateFor(flow);
      res.type('text/csv').attachment(`${flow.id}-data-template.csv`).send(csv);
    } catch (err) {
      err.status = 404;
      next(err);
    }
  });

  return router;
}

/**
 * Whether a step id is covered by the flow's deterministic implementation.
 * Read from the spec source rather than by importing it, so listing flows never
 * executes flow code.
 */
function hasImplementation(flow, stepId) {
  if (!flow.specPath) return false;
  try {
    const source = fs.readFileSync(flow.specPath, 'utf-8');
    return new RegExp(`['"\`]?${escapeRe(stepId)}['"\`]?\\s*:`).test(source);
  } catch {
    return false;
  }
}

function escapeRe(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
