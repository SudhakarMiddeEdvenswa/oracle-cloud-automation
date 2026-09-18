# Oracle Cloud SaaS — Create New Supplier (Playwright Automation)

End-to-end Playwright framework that automates the 21-step **Create New Supplier**
flow for Oracle Cloud SaaS (Procurement), as specified in
[`Create_New_Supplier_AI_Automation_prompt.md`](./Create_New_Supplier_AI_Automation_prompt.md).

## Project structure

```
OracleCloud/
├── .env.example                 # Template for secrets/config (copy to .env)
├── playwright.config.js         # Playwright runtime configuration
├── package.json
├── testdata/
│   └── supplierData.json         # Test data (read at runtime)
├── src/
│   ├── pages/                    # Page Objects (one per screen / flow area)
│   │   ├── BasePage.js
│   │   ├── LoginPage.js          # Step 1
│   │   ├── HomePage.js           # Steps 2-4 (Navigator → Procurement → Suppliers)
│   │   ├── SuppliersPage.js      # Steps 5, 20 (Create / Search supplier)
│   │   ├── CreateSupplierPage.js # Steps 6-7
│   │   ├── SupplierProfilePage.js# Steps 8, 19, 21 (profile, save, validate)
│   │   ├── AddressPage.js        # Steps 9-11
│   │   ├── SitePage.js           # Steps 12-16
│   │   └── ContactPage.js        # Steps 17-18
│   ├── page-helpers/
│   │   └── OracleFusionHelper.js # Oracle ADF/JET-specific interaction helpers
│   └── utils/
│       ├── env.js                # Validated env-var access
│       ├── logger.js             # Timestamped step logging
│       ├── testDataReader.js     # Reads JSON from testdata/
│       └── dataGenerator.js      # Unique supplier name / timestamps
└── tests/
    └── createSupplier.spec.js    # Orchestrates the full 21-step flow
```

## Setup

1. Install dependencies and browsers:

   ```bash
   npm install
   npx playwright install
   ```

2. Create your environment file from the template and fill in values:

   ```bash
   cp .env.example .env      # Windows: copy .env.example .env
   ```

   | Variable                    | Purpose                                          |
   | --------------------------- | ------------------------------------------------ |
   | `ORACLE_BASE_URL`           | Oracle Cloud SaaS environment URL                |
   | `ORACLE_USERNAME`           | Login username (**secret**)                      |
   | `ORACLE_PASSWORD`           | Login password (**secret**)                      |
   | `PROCUREMENT_BUSINESS_UNIT` | BU used for Site Assignments (step 15, optional) |
   | `HEADLESS`                  | `true` / `false`                                 |
   | `BROWSER`                   | `chromium` / `firefox` / `webkit`                |
   | `DEFAULT_TIMEOUT`           | Action/navigation timeout (ms)                   |
   | `SLOW_MO`                   | Slow each op by N ms (debugging)                 |

   > `.env` is git-ignored — never commit real credentials.

## Running

```bash
npm test                 # run all tests headless (per .env)
npm run test:supplier    # run only the create-supplier flow
npm run test:headed      # run with a visible browser
npm run test:debug       # step through with the Playwright Inspector
npm run report           # open the last HTML report
```

## Test data

All business data lives in [`testdata/supplierData.json`](./testdata/supplierData.json)
and is loaded via `src/utils/testDataReader.js`. The Supplier Name is made unique
per run by appending a timestamp (`AUTO_TEST_SUPPLIER_<timestamp>`).

## Live-verified behavior (this pod)

The framework was run end-to-end against a live Oracle Fusion pod and passes all
21 steps. Key environment-specific behaviors it handles:

- **Login** is Oracle Identity Cloud (Username / Password / **Next**).
- **Navigator → Procurement** may be collapsed (an *Expand Procurement* control)
  and its links can sit under a sticky header — handled with force-clicks.
- **Create Supplier** is an inline popup with required **Business Relationship**
  and **Tax Organization Type**; **Tax Registration Number** is disabled until a
  **Tax Country** is chosen and must be **unique per run** (auto-generated).
- **Addresses (Redwood):** the *Purchasing* purpose is labelled **Ordering**;
  City is **City or Town**, Postal Code is **Pin Code**.
- **Sites:** created from the Sites tab; the **Receiving** / **Site Assignments**
  sub-tabs and Autocreate are best-effort (skipped with a warning if the pod
  doesn't expose them). Procurement BU defaults to the pod's BU when the
  configured `PROCUREMENT_BUSINESS_UNIT` isn't available.
- **Contacts** list shows names as `Last, First`; validation matches accordingly.
- Tab switches and save confirmations are stabilized with content-marker waits.

> Set `PROCUREMENT_BUSINESS_UNIT` to a BU that exists in your pod (e.g.
> `US1 Business Unit`). If it isn't found, the run logs a warning and uses the
> site form's default BU.

## Notes on Oracle Fusion locators

Oracle Cloud SaaS renders an ADF / Oracle JET UI whose element IDs are dynamic.
Page objects therefore locate elements by **visible label/role/text** (as the
prompt requires) via `OracleFusionHelper`, which also handles loading glass
panes and LOV/choice-list dropdowns. If your pod's labels differ, adjust the
label strings in the relevant page object — the structure stays the same.

On failure, Playwright captures a screenshot, video, and trace under
`test-results/`, and the HTML report lists the failing step.
