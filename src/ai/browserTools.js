/**
 * The browser tool surface the AI agent drives.
 *
 * Tools are deliberately *label-driven* rather than selector-driven: Oracle
 * Fusion (and most enterprise SaaS) renders dynamic element ids, so the agent
 * is given the same vocabulary a human tester uses — "click the button called
 * Create", "fill the field labelled Address Line 1". Every action also flows
 * through OracleFusionHelper, so the ADF/JET quirks (glass panes, LOV choice
 * lists, hidden checkbox inputs) are handled identically for code and AI.
 */

/** Tool definitions sent to the model. Keep this list stable for prompt caching. */
export const BROWSER_TOOLS = [
  {
    name: 'observe_page',
    description:
      'Read the current page: URL, title, headings, buttons, links, tabs, labelled fields with their current values, checkboxes, table column headers, any error or warning banners, and the visible text. Call this first, and again after any action whose effect you need to confirm.',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description:
            'Optional case-insensitive substring; only matching controls and text are returned. Use it on dense pages.',
        },
      },
    },
  },
  {
    name: 'click_element',
    description:
      'Click a control identified by its accessible role and visible name (preferred), or by its visible text.',
    input_schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['button', 'link', 'tab', 'menuitem', 'checkbox', 'option', 'row', 'cell', 'heading'],
        },
        name: { type: 'string', description: 'Visible name of the control.' },
        text: { type: 'string', description: 'Use instead of role+name when the target is plain text.' },
        exact: { type: 'boolean', description: 'Match the name exactly. Default false.' },
        nth: { type: 'number', description: '0-based index when several controls share a name. Default 0.' },
        force: {
          type: 'boolean',
          description: 'Bypass an overlay intercepting the click (sticky headers). Default false.',
        },
      },
    },
  },
  {
    name: 'fill_field',
    description: 'Type a value into a text input identified by its visible label.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        value: { type: 'string' },
        exact: {
          type: 'boolean',
          description: 'Exact label match. Default true — turn it off only if the exact label fails.',
        },
      },
      required: ['label', 'value'],
    },
  },
  {
    name: 'select_option',
    description:
      'Choose a value in a dropdown, choice list or list-of-values identified by its visible label. Handles native selects, searchable LOVs and autocomplete comboboxes.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        value: { type: 'string' },
        exact: { type: 'boolean' },
      },
      required: ['label', 'value'],
    },
  },
  {
    name: 'set_checkbox',
    description: 'Tick or untick a checkbox identified by its visible label.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        checked: { type: 'boolean' },
      },
      required: ['label', 'checked'],
    },
  },
  {
    name: 'press_key',
    description:
      'Press a keyboard key (Enter, Tab, Escape, …), optionally while a labelled field is focused.',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        label: { type: 'string', description: 'Focus this labelled field first.' },
      },
      required: ['key'],
    },
  },
  {
    name: 'wait_for',
    description:
      'Wait for text to appear or disappear on the page, or for the application to finish loading.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        state: { type: 'string', enum: ['visible', 'hidden'], description: 'Default visible.' },
        timeoutSeconds: { type: 'number', description: 'Default 30.' },
      },
    },
  },
  {
    name: 'read_value',
    description:
      'Extract a value from the page — either a labelled field value, or the first capture group of a regular expression applied to the visible text. Use this to read generated identifiers such as a Supplier Number or PO Number.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Read this labelled field value.' },
        pattern: {
          type: 'string',
          description: 'Regular expression with one capture group, applied to the page text.',
        },
      },
    },
  },
  {
    name: 'capture_value',
    description:
      'Store a business value produced by this run so later steps, the verification rules and the report can use it.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Capture name declared by the flow, e.g. supplierNumber.' },
        value: { type: 'string' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'take_screenshot',
    description:
      'Take a screenshot of the current page and look at it. Use this only when the text observation is not enough to decide what to do — it is much more expensive than observe_page.',
    input_schema: {
      type: 'object',
      properties: { note: { type: 'string', description: 'Why you need to look.' } },
    },
  },
  {
    name: 'finish_step',
    description:
      'End this step. Call it exactly once, when the step is complete or when you are certain it cannot be completed.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['done', 'failed'] },
        summary: {
          type: 'string',
          description:
            'One or two sentences: what you did, or why it could not be done. If the application rejected the data, quote its message verbatim.',
        },
      },
      required: ['status', 'summary'],
    },
  },
];

/** Tools whose effect on the page is reproducible, so they are worth recording for replay. */
export const REPLAYABLE = new Set([
  'click_element',
  'fill_field',
  'select_option',
  'set_checkbox',
  'press_key',
  'wait_for',
  'read_value',
  'capture_value',
]);

/**
 * Build the executor for the browser tools, bound to one FlowContext.
 *
 * @param {import('../core/FlowContext.js').FlowContext} ctx
 * @returns {{execute: (name:string, input:object)=>Promise<{content:any, finished?:object}>}}
 */
export function createToolExecutor(ctx) {
  const { page, oracle } = ctx;
  const timeout = ctx.settings.defaultTimeout || 60000;

  async function execute(name, input = {}) {
    switch (name) {
      case 'observe_page':
        return { content: await observePage(page, input.filter) };

      case 'click_element': {
        const locator = resolveLocator(page, input);
        await locator.waitFor({ state: 'visible', timeout });
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ force: input.force === true, timeout });
        await oracle.waitForLoading();
        return { content: `Clicked ${describeTarget(input)}.` };
      }

      case 'fill_field':
        await oracle.fillByLabel(input.label, input.value, { exact: input.exact !== false });
        return { content: `Filled "${input.label}" with "${input.value}".` };

      case 'select_option':
        await oracle.selectFromLov(input.label, input.value, { exact: input.exact !== false });
        return { content: `Selected "${input.value}" for "${input.label}".` };

      case 'set_checkbox':
        await oracle.setCheckbox(input.label, input.checked === true);
        return { content: `Set checkbox "${input.label}" to ${input.checked === true}.` };

      case 'press_key': {
        if (input.label) {
          await page.getByLabel(input.label, { exact: false }).first().press(input.key);
        } else {
          await page.keyboard.press(input.key);
        }
        await oracle.waitForLoading();
        return { content: `Pressed ${input.key}.` };
      }

      case 'wait_for': {
        const waitTimeout = (input.timeoutSeconds ?? 30) * 1000;
        if (input.text) {
          await page
            .getByText(input.text, { exact: false })
            .first()
            .waitFor({ state: input.state === 'hidden' ? 'hidden' : 'visible', timeout: waitTimeout });
          return {
            content: `Text "${input.text}" is now ${input.state === 'hidden' ? 'hidden' : 'visible'}.`,
          };
        }
        await oracle.waitForLoading();
        return { content: 'The application finished loading.' };
      }

      case 'read_value': {
        if (input.label) {
          const field = page.getByLabel(input.label, { exact: false }).first();
          await field.waitFor({ state: 'visible', timeout });
          const value =
            (await field.inputValue().catch(() => null)) ??
            ((await field.textContent().catch(() => '')) || '').trim();
          return { content: `"${input.label}" = "${value}"` };
        }
        if (input.pattern) {
          const text = await page.locator('body').innerText().catch(() => '');
          const match = new RegExp(input.pattern, 'im').exec(text);
          if (!match) return { content: `No match for /${input.pattern}/ on the page.` };
          return { content: `Match: "${match[1] ?? match[0]}"` };
        }
        return { content: 'read_value needs either a label or a pattern.' };
      }

      case 'capture_value':
        ctx.capture(input.name, String(input.value ?? ''));
        return { content: `Captured ${input.name} = "${input.value}".` };

      case 'take_screenshot': {
        const buffer = await page.screenshot({ fullPage: false, type: 'png' });
        return {
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: buffer.toString('base64') },
            },
            { type: 'text', text: `Screenshot of ${page.url()}` },
          ],
        };
      }

      case 'finish_step':
        return {
          content: 'Step closed.',
          finished: {
            status: input.status === 'done' ? 'done' : 'failed',
            summary: input.summary || '',
          },
        };

      default:
        return { content: `Unknown tool "${name}".` };
    }
  }

  return { execute };
}

/** Turn a click_element input into a Playwright locator. */
function resolveLocator(page, input) {
  const nth = Number.isInteger(input.nth) ? input.nth : 0;
  if (input.role && input.name) {
    return page.getByRole(input.role, { name: input.name, exact: input.exact === true }).nth(nth);
  }
  if (input.role) return page.getByRole(input.role).nth(nth);
  if (input.text) return page.getByText(input.text, { exact: input.exact === true }).nth(nth);
  if (input.name) {
    return page.getByRole('button', { name: input.name, exact: input.exact === true }).nth(nth);
  }
  throw new Error('click_element needs role+name or text');
}

function describeTarget(input) {
  if (input.role && input.name) return `${input.role} "${input.name}"`;
  if (input.text) return `text "${input.text}"`;
  return `${input.role || 'element'} "${input.name || ''}"`;
}

/**
 * Compact, label-oriented description of the page. This is the agent's eyes;
 * keeping it small and structured matters more than completeness.
 * @param {import('@playwright/test').Page} page
 * @param {string} [filter]
 * @returns {Promise<string>}
 */
export async function observePage(page, filter) {
  const snapshot = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
    };
    const text = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

    const labelFor = (el) => {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const parts = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((n) => text(n));
        if (parts.join(' ').trim()) return parts.join(' ').trim();
      }
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label && text(label)) return text(label);
      }
      const wrapping = el.closest('label');
      if (wrapping && text(wrapping)) return text(wrapping);
      return (el.getAttribute('placeholder') || el.getAttribute('title') || el.name || '').trim();
    };

    const take = (selector, fn, limit) =>
      Array.from(document.querySelectorAll(selector)).filter(visible).slice(0, limit).map(fn).filter(Boolean);

    return {
      url: location.href,
      title: document.title,
      headings: take('h1,h2,h3,[role="heading"]', (el) => text(el), 25).filter(Boolean),
      buttons: Array.from(
        new Set(
          take(
            'button,[role="button"],input[type="submit"],input[type="button"]',
            (el) => text(el) || labelFor(el),
            120
          )
        )
      ).filter(Boolean),
      links: Array.from(new Set(take('a,[role="link"]', (el) => text(el) || labelFor(el), 150))).filter(Boolean),
      tabs: Array.from(new Set(take('[role="tab"]', (el) => text(el) || labelFor(el), 40))).filter(Boolean),
      fields: take(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),textarea,select,[role="combobox"]',
        (el) => {
          const label = labelFor(el);
          if (!label) return null;
          const kind = el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox' ? 'choice' : 'text';
          const options =
            el.tagName === 'SELECT'
              ? Array.from(el.options)
                  .map((o) => (o.label || o.text || '').trim())
                  .filter(Boolean)
                  .slice(0, 25)
              : null;
          return {
            label,
            kind,
            value: el.value ?? '',
            disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
            required: !!el.required || el.getAttribute('aria-required') === 'true',
            options,
          };
        },
        90
      ),
      checkboxes: take(
        'input[type="checkbox"],[role="checkbox"]',
        (el) => {
          const label = labelFor(el) || text(el.parentElement || el);
          if (!label) return null;
          return { label, checked: el.checked === true || el.getAttribute('aria-checked') === 'true' };
        },
        60
      ),
      columnHeaders: Array.from(new Set(take('th,[role="columnheader"]', (el) => text(el), 60))).filter(Boolean),
      messages: Array.from(
        new Set(take('[role="alert"],[role="status"],.AFErrorText,[class*="Error"]', (el) => text(el), 40))
      ).filter((t) => t && t.length < 400),
      bodyText: (document.body.innerText || '').replace(/\n{2,}/g, '\n').trim().slice(0, 6000),
    };
  });

  return formatObservation(snapshot, filter);
}

function formatObservation(s, filter) {
  const keep = (value) => {
    if (!filter) return true;
    return String(value ?? '').toLowerCase().includes(String(filter).toLowerCase());
  };

  const out = [];
  out.push(`URL: ${s.url}`);
  out.push(`TITLE: ${s.title}`);
  if (s.headings.length) out.push(`HEADINGS: ${s.headings.filter(keep).join(' | ')}`);
  if (s.messages.length) {
    out.push(`MESSAGES / BANNERS:\n${s.messages.map((m) => `  - ${m}`).join('\n')}`);
  }

  const fields = s.fields.filter((f) => keep(f.label) || keep(f.value));
  if (fields.length) {
    out.push('FIELDS (label [kind] = current value):');
    for (const f of fields) {
      const flags = [f.required ? 'required' : null, f.disabled ? 'disabled' : null].filter(Boolean).join(',');
      const options = f.options && f.options.length ? ` options: ${f.options.join(' / ')}` : '';
      out.push(`  - ${f.label} [${f.kind}${flags ? ` ${flags}` : ''}] = "${f.value}"${options}`);
    }
  }

  const checkboxes = s.checkboxes.filter((c) => keep(c.label));
  if (checkboxes.length) {
    out.push(`CHECKBOXES: ${checkboxes.map((c) => `${c.label}=${c.checked ? 'on' : 'off'}`).join(' | ')}`);
  }
  const buttons = s.buttons.filter(keep);
  if (buttons.length) out.push(`BUTTONS: ${buttons.join(' | ')}`);
  const tabs = s.tabs.filter(keep);
  if (tabs.length) out.push(`TABS: ${tabs.join(' | ')}`);
  const links = s.links.filter(keep);
  if (links.length) out.push(`LINKS: ${links.slice(0, 80).join(' | ')}`);
  if (s.columnHeaders.length) out.push(`TABLE COLUMNS: ${s.columnHeaders.filter(keep).join(' | ')}`);

  out.push(`VISIBLE TEXT:\n${filter ? filterLines(s.bodyText, filter) : s.bodyText}`);
  return out.join('\n');
}

function filterLines(text, filter) {
  const needle = String(filter).toLowerCase();
  return String(text)
    .split('\n')
    .filter((line) => line.toLowerCase().includes(needle))
    .slice(0, 80)
    .join('\n');
}
