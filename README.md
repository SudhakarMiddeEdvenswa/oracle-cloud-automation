# Oracle Cloud Automation Platform

A generic, data-driven UI automation platform with an AI agent behind every step.

Pick a business flow from a dropdown, attach a CSV of test data, type in the
instance URL and credentials, choose headed or headless, add any extra
instructions, and execute. One CSV row is one test case; the platform reports
each one individually and produces an HTML, CSV or XLSX report:

```
Execute                  2 Success out of 5

Supplier1                Success
Supplier2                Failed -- Already exists
Supplier3                Invalid Data -- Missing Tax Registration Number
```

---

## The idea in one page

A flow is **not** code. A flow is a folder in [`registry/`](./registry/):

```
registry/create-supplier/
├── flow.json           the manifest: name, module, and the CSV field contract
├── steps.txt           Detailed Steps — what the flow does, in plain English
├── verify.txt          Verification File — how success is judged
├── data.template.csv   Data File — a ready-to-fill template
└── flow.js             optional deterministic Playwright implementation
```

`steps.txt` is the single source of truth for the step list. `flow.js`, when it
exists, supplies fast deterministic implementations keyed by the same step ids.
Every step is then attempted in cost order:

| Order | Engine   | What it is                                            | Cost                |
| ----- | -------- | ----------------------------------------------------- | ------------------- |
| 1     | `code`   | The deterministic implementation from `flow.js`       | Fast, free          |
| 2     | `replay` | An action sequence the AI learned on an earlier run   | Fast, free          |
| 3     | `ai`     | Claude driving the browser live from `steps.txt`      | A model call        |

The first engine that completes the step wins, and whatever the AI learns is
written back to the flow's folder (`healed-steps.json`) so the next run replays
it instead of paying for it again. That is the whole design:

- **A step with working code** never calls the model.
- **A step whose code broke** because a label moved is completed by the agent
  from the written instruction, and keeps running.
- **A step with no code at all** is executed by the agent from prose — which is
  why adding a new business flow means writing a text file, not a page object.

Adding a folder to `registry/` adds an entry to the UI dropdown. No platform
code changes.

---

## What ships today

| Flow                   | Module               | Engine                    |
| ---------------------- | -------------------- | ------------------------- |
| Create Supplier        | Procurement          | coded (10 steps) + AI fallback |
| Create Pur Requisition | Procurement          | AI-driven                 |
| Create Purchase Order  | Procurement          | AI-driven                 |
| Update Purchase Order  | Procurement          | AI-driven                 |
| Update PO Requisition  | Procurement          | AI-driven                 |
| GRN Creation           | Inventory / Receiving| AI-driven                 |
| PO Receipt             | Inventory / Receiving| AI-driven                 |
| AP Invoice Creation    | Payables             | AI-driven                 |
| AP Payment             | Payables             | AI-driven                 |

Create Supplier is the reference implementation: all 10 of its steps have
deterministic code, verified against a live Oracle Fusion pod. The other eight
are registered with their steps, verification rules and CSV templates, and run
through the AI agent. Their navigation follows standard Fusion paths — adjust
the prose in `steps.txt` to match your pod and the agent follows the change on
the next run, no code edit required.

---

## Setup

```bash
npm install
npx playwright install
cp .env.example .env      # Windows: copy .env.example .env
```

Then edit `.env`. Only one setting really matters:

```ini
# Required for AI-driven flows, locator self-healing, and "ai:" verification
# rules. Get one at https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, the platform still runs every step that has deterministic code
(so Create Supplier works end to end) and says plainly which steps it cannot
run. The instance URL, user name and password in `.env` are only *defaults* that
prefill the UI — a shared server can leave them blank and let each user type
their own.

---

## Running

### The web UI

```bash
npm run ui            # build the UI, then serve everything on one port
```

Open <http://127.0.0.1:4000>.

```bash
npm run ui:dev        # API + Vite dev server with hot reload (UI on :4100)
npm run ui:server     # API only, serving the last built UI
npm run ui:build      # rebuild the UI bundle
```

The UI gives you:

- **Form / Function Name** — the flow dropdown, grouped by module
- **Data file** — upload a CSV, download a template, and *Check data file* to
  dry-run the data with no browser opened
- **Instance details** — URL, user name, password
- **Mode** — headed or headless, plus browser and timeout
- **Additional instructions** — free text passed to the AI agent with every step
- **Report format** — HTML, CSV and/or XLSX
- A live log stream, per-row results as they finish, and report downloads

### The command line

Same engine, no UI — for CI or a quick local run:

```bash
npm run run -- --list
npm run run -- --flow create-supplier \
               --data ./my-suppliers.csv \
               --url https://your-pod.fa.ocs.oraclecloud.com \
               --user jdoe --password secret \
               --report html,xlsx --headed
```

Exit code is 0 only when every row succeeded. `--help` lists every option.

### The standalone Playwright spec

The original single-scenario spec still works unchanged, reading `.env` and
`testdata/supplierData.json`:

```bash
npm run test:supplier
npm run test:headed
```

---

## The data file

One row per test case. The header uses the flow's field names, and the platform
also accepts the human labels, `snake_case` and any alias the manifest declares
— so `taxRegistrationNumber`, `Tax Registration Number` and `Tax Id` all land in
the same field.

Download a template from the UI, or:

```bash
curl -o data.csv http://127.0.0.1:4000/api/flows/create-supplier/template
```

Three conventions are worth knowing:

- **`AUTO`** in a cell asks the platform to generate a unique value for that
  field (a fresh supplier name, a fresh GSTIN-shaped tax number, today's date).
  Generated values mix in the row number, so row 2 never collides with row 1.
- **A blank cell** falls back to the field's default, or generates a value when
  the field is declared `autofill: blank`.
- **A blank required cell with no default** makes the row *invalid*: it is
  reported as `Invalid Data -- Missing <Field>` without opening a browser. That
  is how you write a deliberate negative test — leave the tax id out and the
  report says `Missing Tax Registration Number`.

Pipe-separated lists work for multi-value fields: `Ordering|Remit to`.

---

## Reports

Every run writes `runs/<runId>/` containing `run.json`, the failure screenshots,
and the formats you asked for:

- **HTML** — a single self-contained file: headline count, run details, session
  setup, a results table, and a collapsible section per row with its test data,
  captured values, step trail (tagged `code` / `replay` / `ai`), verification
  evidence and screenshots.
- **CSV** — one line per test case plus the run summary as trailing metadata.
- **XLSX** — five sheets: Summary, Results, Steps, Verification, Test Data, with
  colour-coded outcomes and filters.

Credentials are never written to a run record or a report. The run record keeps
the URL and the user name; the password exists only in memory for the run.

---

## Adding a flow

See [`registry/README.md`](./registry/README.md) for the full contract. The short
version: create a folder, write `flow.json` (the CSV fields), `steps.txt` (the
steps in plain English) and `verify.txt` (the assertions). Reload the UI and the
flow is in the dropdown, executed by the AI agent. If a step proves slow or
flaky, add a `flow.js` implementation for that one step id — the rest keeps
working exactly as before.

---

## Project structure

```
OracleCloud/
├── registry/                     One folder per business flow (see its README)
│   ├── create-supplier/          Reference flow: manifest, steps, rules, code
│   └── …                         Eight more flows, AI-driven
├── platform/
│   ├── cli.js                    Headless runner for CI
│   ├── server/
│   │   ├── index.js              Express app; serves the API and the built UI
│   │   ├── routes/               /api/flows, /api/runs (+ SSE, reports)
│   │   ├── runner/
│   │   │   ├── RunManager.js     Orchestrates one run: rows, browser, reports
│   │   │   └── RunStore.js       Live runs, run history, one-run-at-a-time
│   │   └── reporting/            HTML, CSV and XLSX report builders
│   └── web/                      React UI (Vite)
├── src/
│   ├── core/
│   │   ├── registry.js           Loads flow folders
│   │   ├── stepsFile.js          Parses steps.txt
│   │   ├── verify.js             Parses and executes verify.txt
│   │   ├── rowData.js            Resolves a CSV row against the field contract
│   │   ├── csv.js                CSV parse / write / templates
│   │   ├── FlowContext.js        What a step sees: page, data, captures
│   │   ├── StepRunner.js         The code -> replay -> AI engine chain
│   │   └── outcome.js            Row status and error classification
│   ├── ai/
│   │   ├── StepAgent.js          The agentic loop that drives the browser
│   │   ├── browserTools.js       The label-driven tool surface Claude uses
│   │   └── HealingStore.js       Records and replays what the agent learned
│   ├── pages/                    Page objects (used by Create Supplier)
│   ├── page-helpers/
│   │   └── OracleFusionHelper.js ADF / Oracle JET interaction quirks
│   └── utils/                    env, logger, data generators, test data
├── tests/createSupplier.spec.js  The original standalone Playwright spec
└── runs/                         Run output (git-ignored)
```

---

## Why it is label-driven

Oracle Fusion renders an ADF / Oracle JET UI whose element ids are generated and
change between sessions and releases. Both the page objects and the AI agent
therefore locate elements the way a human tester does — by visible label, role
and text — through `OracleFusionHelper`, which also absorbs the blocking glass
pane, the LOV and choice-list variants, and the checkboxes whose real `<input>`
is hidden behind its label.

Pod-specific behaviour already handled for Create Supplier:

- Login is Oracle Identity Cloud (Username / Password / **Next**), and two-step
  sign-in forms are handled as well as single-page ones.
- **Navigator → Procurement** may be collapsed behind *Expand Procurement*, and
  its links can sit under a sticky header.
- Create Supplier is an inline popup; **Tax Registration Number** stays disabled
  until a **Tax Country** is chosen and must be unique per run.
- In the Redwood address UI the Purchasing purpose is labelled **Ordering**,
  City is **City or Town**, and Postal Code is **Pin Code**.
- The Receiving and Site Assignments sub-tabs are best-effort: if a pod does not
  expose them the step is skipped with a warning rather than failing the row.
- The Contacts grid renders names as `Last, First`.

---

## Notes and limits

- **One run at a time.** A run drives a real browser against a real instance;
  two concurrent runs would fight over the same session and the same data. The
  API rejects a second run with a clear message.
- **Session steps run once.** Steps marked `scope=session` (sign-in, navigation)
  execute once per run. If they fail, the run stops immediately instead of
  repeating a doomed login for every row, and the remaining rows are reported as
  `Skipped -- Session setup failed`.
- **The agent is honest about failure.** It is instructed to report a business
  rejection — a duplicate record, a validation error, a missing mandatory field
  — verbatim, and never to pass a step it did not actually complete. A quoted
  application message is what lets the platform classify the row as
  `Failed -- Already exists` rather than an anonymous error.
- **Learned sequences are environment-specific.** `healed-steps.json` is
  git-ignored by default; commit a flow's file deliberately if you want a pod's
  healed steps shared with the team. A sequence that fails three runs in a row
  is discarded and relearned.
