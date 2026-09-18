# The flow registry

One folder per business flow. Drop a folder in here and it appears in the UI
dropdown — there is no platform code to change and nothing to register
elsewhere.

```
registry/<flow-id>/
├── flow.json            required   manifest: name, module, CSV field contract
├── steps.txt            required   the steps, in plain English
├── verify.txt           optional   the assertions that decide success
├── data.template.csv    optional   a ready-to-fill data file (generated if absent)
├── flow.js              optional   deterministic Playwright implementations
└── healed-steps.json    generated  action sequences the AI agent learned
```

A flow with no `flow.js` is executed entirely by the AI agent from `steps.txt`.
A flow with a `flow.js` uses its implementations where they exist and falls back
to the agent for everything else — including for a coded step that breaks
because the application UI moved.

---

## flow.json

```json
{
  "id": "create-requisition",
  "name": "Create Pur Requisition",
  "module": "Procurement",
  "order": 20,
  "description": "Raises a purchase requisition and submits it for approval.",
  "rowLabelField": "requisitionDescription",
  "captures": [
    { "name": "requisitionNumber", "description": "The number generated on submit." }
  ],
  "fields": [ ... ]
}
```

| Key             | Meaning                                                            |
| --------------- | ------------------------------------------------------------------ |
| `id`            | Must match the folder name.                                        |
| `name`          | What the dropdown shows.                                           |
| `module`        | Groups the dropdown (Procurement, Payables, …).                    |
| `order`         | Sort order within the dropdown.                                    |
| `rowLabelField` | Which field names a row in logs and reports.                       |
| `captures`      | Values the flow produces at runtime, for verification and reports.  |
| `fields`        | The CSV contract — see below.                                      |

### Fields

```json
{
  "name": "taxRegistrationNumber",
  "label": "Tax Registration Number",
  "aliases": ["Tax Id", "GSTIN"],
  "required": true,
  "type": "string",
  "generated": "unique-gstin",
  "autofill": "token",
  "default": "",
  "example": "AUTO",
  "note": "Enter AUTO for a fresh number, or leave blank to test the missing-value path."
}
```

| Key                | Meaning                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `name`             | The CSV column name, and the `{{placeholder}}` used in `steps.txt`.           |
| `label`            | Human name, shown in the UI and in "Missing …" messages.                      |
| `aliases`          | Extra header spellings accepted for this column.                              |
| `required`         | A blank value with no default makes the row `Invalid Data`.                    |
| `type`             | `string` (default), `number`, `boolean` (`Yes/Y/true/1/x`), or `list`.         |
| `listSeparator`    | For `list`; defaults to `\|`.                                                  |
| `generated`        | Which generator fills the field — see below.                                   |
| `autofill`         | `blank` (default: generate when the cell is empty) or `token` (only on `AUTO`).|
| `generatorPrefix`  | Prefix for `unique-name` and `timestamp`.                                      |
| `default`          | Used when the cell is empty and nothing was generated.                         |
| `example`          | The value written into the generated CSV template.                             |
| `note`             | Shown as guidance in the UI.                                                   |

Header matching ignores case, spaces, underscores and punctuation, so
`Tax Registration Number`, `tax_registration_number` and `taxRegistrationNumber`
are the same column.

### Generators

| `generated`    | Produces                                                        |
| -------------- | --------------------------------------------------------------- |
| `unique-name`  | `<prefix>_20260918231045_R2` — unique per run *and* per row      |
| `unique-gstin` | A fresh India GSTIN-shaped tax registration number               |
| `timestamp`    | `<prefix>2026091823104502`                                       |
| `uuid`         | A random identifier                                              |
| `today`        | `2026-09-18`                                                     |
| `today+7`      | Any `today+N` / `today-N` day offset                             |

`autofill` decides when a generator fires, and it matters:

- `"autofill": "blank"` — generate whenever the cell is empty. Use it for
  values that simply have to be unique, like a supplier name.
- `"autofill": "token"` — generate only when the cell literally says `AUTO`. A
  blank cell then stays blank, so a `required` field reports as missing. This is
  what makes a deliberate negative-test row behave like one.

---

## steps.txt

```
# Comments start with #

[login scope=session] Log in to the application
Open the application URL and sign in with the supplied user name and password.
Expected: The application home page is displayed.

[create-order] Create the purchase order
Click Create and enter:
  Supplier    {{supplier}}
  Quantity    {{quantity}}
Expected: A purchase order number is shown.
```

- `[step-id]` must be lowercase, and is what `flow.js` keys its implementations
  on. Keep ids stable: renaming one orphans its implementation and its learned
  action sequence.
- `scope=session` runs the step once per execution instead of once per row. Use
  it for sign-in and navigation. A failing session step stops the run.
- `optional` turns a failure into a warning instead of failing the row — right
  for sub-tabs and features a pod may not expose.
- `Expected:` is what the agent checks before it will call the step done. Write
  it as an observable fact, not an intention.
- `{{field}}` resolves against the row's data, everything captured so far, plus
  `baseUrl` and `username`. An unresolved placeholder is left as-is so the agent
  can still see what was meant.

Write the instruction the way you would brief a new tester: what to click, what
to type, and which labels this application actually uses. Naming the awkward
labels up front ("City is labelled *City or Town*") saves the agent a round trip
and makes the step deterministic sooner.

---

## verify.txt

Assertions run after the flow's steps, against the page the flow left behind.
One rule per line.

```
captured-not-empty: supplierNumber
captured-matches:   supplierNumber = ^\d{4,}$
text-visible:       {{supplierName}}
open-tab:           Addresses
text-visible:       {{addressName}}
field-contains:     Supplier Type = {{supplierType}}
ai:                 No error banner is present anywhere on the page.
```

| Rule                 | Checks                                                    |
| -------------------- | --------------------------------------------------------- |
| `open-tab`           | Not an assertion — switches tab for the rules that follow |
| `text-visible`       | The text is visible on the page                           |
| `text-not-visible`   | The text is absent                                        |
| `field-equals`       | `<label> = <value>`, exact, case-insensitive              |
| `field-contains`     | `<label> = <value>`, substring, case-insensitive          |
| `captured-not-empty` | A captured value exists and is non-empty                  |
| `captured-matches`   | `<name> = <regex>`                                        |
| `ai`                 | A free-text claim judged by the AI agent from the page    |

Every failed rule is listed in the report with its evidence, and any failure
makes the row `Failed -- Verification failed (n of m)`.

Prefer the deterministic rules; they are free and unambiguous. Reach for `ai:`
when the claim spans the whole screen ("no error banner anywhere", "the totals
are consistent") — the kind of judgement that would otherwise need a dozen
brittle selectors. `ai:` rules are skipped with a failure if no API key is set.

---

## flow.js

Only needed when you want deterministic code for a step.

```js
export function buildSteps(ctx) {
  const data = ctx.row.data;
  const page = new SomePage(ctx.page, {
    baseUrl: ctx.instance.baseUrl,
    username: ctx.instance.username,
    password: ctx.instance.password,
    defaultTimeout: ctx.settings.defaultTimeout,
  });

  return {
    'create-order': async () => {
      await page.createOrder(data.supplier, data.quantity);
      ctx.capture('orderNumber', await page.readOrderNumber());
    },
  };
}

export default { buildSteps };
```

`buildSteps(ctx)` is called once per row and returns a map of step id to
handler. Return only the ids you implement; anything missing goes to the agent.

What `ctx` gives you:

| Member                      | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `ctx.page`                  | The Playwright page                                  |
| `ctx.oracle`                | `OracleFusionHelper` — label-driven interactions     |
| `ctx.row.data`              | The resolved row, typed per the manifest             |
| `ctx.row.label`             | How this row is named in reports                     |
| `ctx.instance`              | `baseUrl`, `username`, `password`                    |
| `ctx.settings`              | `defaultTimeout`, `browser`, `headless`, …           |
| `ctx.captured`              | Values captured so far                               |
| `ctx.capture(name, value)`  | Record a captured value                              |
| `ctx.values`                | Row data + captures, the `{{placeholder}}` scope      |
| `ctx.info / warn / pass`    | Log into the run's live stream and report            |
| `ctx.screenshot(name)`      | Save a screenshot into the run folder                |
| `ctx.additionalInstructions`| What the user typed in the UI                        |

Throw to fail a step. The platform catches it, falls back to the next engine,
and classifies the message — so if the application rejected the data, let its
message reach the error text rather than replacing it with your own.

---

## Practical advice

**Start with prose, add code later.** Write `flow.json`, `steps.txt` and
`verify.txt`, run it headed once, and watch what the agent does. When a step is
right, it gets cached to `healed-steps.json` and stops costing a model call. Only
write `flow.js` for steps that stay slow or ambiguous.

**Keep step ids stable and steps small.** One id per logical checkpoint. A step
that does three things is harder for the agent to recover halfway through, and
its learned sequence is more brittle.

**Put pod quirks in the UI's Additional instructions, not in the files**, while
you are still exploring. Once a quirk turns out to be permanent for your
environment, move it into `steps.txt` so everyone benefits.

**Test the negative paths.** Add a row with a blank required field and a row
with a name that already exists. A report that only ever says `Success` has not
told you the verification rules work.
