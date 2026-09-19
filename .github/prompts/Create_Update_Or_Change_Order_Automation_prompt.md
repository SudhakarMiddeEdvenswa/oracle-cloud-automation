# AI Prompt: Oracle Cloud SaaS Update Order Automation Using Playwright

Act as a **Senior Oracle Cloud SaaS Procurement Automation Engineer and Playwright Test Architect**.

Create a production-ready **Playwright automation test framework and test scenario** for updating an existing Purchase Order in **Oracle Cloud SaaS Procurement** using the Oracle UI.

The automation must follow the complete business flow below and must be suitable for Oracle Fusion Cloud SaaS environments where UI labels, Redwood/classic pages, generated element IDs, security roles, approval workflows, and master data can vary.

## Execution Flow — Exactly 22 Steps

### Step 1 — Login to Oracle Cloud

1. Launch the configured Oracle Cloud SaaS URL.
2. Enter the configured test username and password.
3. Click **Sign In**.
4. Verify that the Oracle Cloud home page is displayed.

### Step 2 — Open Navigator

1. Click **Navigator**.
2. Wait for the Navigator menu to become visible.
3. Verify that **Procurement** is available.

### Step 3 — Navigate to Procurement

1. Select **Procurement** from Navigator.
2. Wait for the Procurement work area to load.
3. Verify that the Procurement page is displayed.

### Step 4 — Open Purchase Orders / Manage Orders

1. Navigate to **Purchase Orders**.
2. Open the applicable **Manage Orders** or Purchase Order search page.
3. Verify that the search controls are displayed.

### Step 5 — Search for the Existing Purchase Order

1. Retrieve the test PO number from test data or runtime fixture.
2. Enter the PO number in the search field.
3. Click **Search**.
4. Wait for the search results.
5. Verify that the expected PO is returned.

Do not select the first search result blindly. Match the exact PO number.

### Step 6 — Open and Capture Existing PO Details

Open the matching Purchase Order and capture the original values:

* PO Number
* Supplier
* Supplier Site
* Procurement BU
* Buyer
* Currency
* PO Status
* Description
* Line Number
* Item
* Quantity
* Price
* UOM
* Need-by Date
* Ship-to Organization
* Ship-to Location
* Charge Account

Store these values for before/after validation.

### Step 7 — Start the PO Update / Change Order

1. Open the PO action menu.
2. Select the applicable **Edit**, **Update**, or **Change Order** action available in the environment.
3. Wait until the PO enters an editable/change-order state.
4. Verify that the required fields are editable.

Do not assume one exact Oracle label if the configured UI uses an equivalent action.

### Step 8 — Verify the Change Order Context

Verify the PO header and change-order/revision information, where available:

* PO Number
* Revision
* Change Order Number
* Supplier
* Supplier Site
* Procurement BU
* Buyer
* Currency
* Current PO Status

Capture any runtime revision/change-order identifier exposed by Oracle.

### Step 9 — Update the PO Description

If the scenario includes a header update:

1. Locate the PO Description field.
2. Capture the original description.
3. Replace it with a dynamically generated description.
4. Verify that the updated description is displayed.

Use unique test data such as:

`AUTO_UPDATE_PO_<timestamp>`

### Step 10 — Open the Required PO Line

1. Navigate to the Lines section.
2. Locate the target line using the configured line number or item.
3. Open/select the line.
4. Verify the original item, quantity, price, and UOM.

Do not rely on row position alone when multiple lines exist.

### Step 11 — Update PO Line Quantity

For the primary happy-path scenario:

1. Capture the original quantity.
2. Change the quantity from the configured old value to the new value.
3. Example: change quantity from `1` to `2`.
4. Verify the new quantity before continuing.

### Step 12 — Update PO Line Price

If the selected scenario requires a price change:

1. Capture the original price.
2. Enter the configured new price.
3. Verify the updated price.
4. If price is not part of the scenario, leave it unchanged and verify that it remains unchanged.

Do not modify fields that are outside the current test scenario.

### Step 13 — Update Schedule / Need-by Date

1. Open Schedule details for the target PO line.
2. Capture the existing Need-by Date.
3. Enter the configured new future Need-by Date if the scenario requires it.
4. Verify the updated date.
5. Verify Ship-to Organization and Ship-to Location.

### Step 14 — Update Ship-to Information

If required by the scenario:

1. Capture the existing Ship-to Organization and Location.
2. Change the Ship-to Location to the configured valid test value.
3. Verify the new location.
4. If the scenario does not require a location change, verify that the original value remains unchanged.

Never invent organization or location master data.

### Step 15 — Verify Distribution

Open the distribution details and verify:

* Distribution Number
* Quantity
* Charge Account
* Cost Center
* Project/Task, where applicable

If distribution is not part of the test, do not change it. Capture the original values for regression validation.

### Step 16 — Validate All Intended Changes

Before submitting, compare original and updated values.

For example:

```text
PO Number          = unchanged
Supplier           = unchanged
Supplier Site      = unchanged
Item               = unchanged
Old Quantity       = 1
New Quantity       = 2
Old Price          = 75000
New Price          = 75000
Need-by Date       = expected updated date
Ship-to Location   = expected value
Description        = expected updated description
```

Verify that only the fields intended by the test scenario have changed.

### Step 17 — Review the Updated Purchase Order

Navigate to the Oracle review/summary area.

Validate:

* PO header
* Supplier
* PO lines
* Quantity
* Price
* Schedule
* Ship-to
* Distribution
* Description
* Change Order/Revision information

Capture screenshots at this stage if required by the test framework.

### Step 18 — Submit the Update / Change Order

1. Click the applicable **Submit**, **Submit for Approval**, or equivalent action.
2. Wait for Oracle to process the submission.
3. Verify that the submission confirmation or resulting status is displayed.

Do not hard-code a single final status unless the environment's workflow configuration guarantees it.

### Step 19 — Capture Submission Details

Capture all available business identifiers:

* PO Number
* Revision
* Change Order Number
* Submission status
* Confirmation message

Store these values in the Playwright test context for downstream validation.

### Step 20 — Search for the Updated PO Again

Navigate back to **Purchase Orders → Manage Orders**.

1. Search using the captured PO Number.
2. Wait for the results.
3. Match the exact PO.
4. Open the updated PO.

### Step 21 — Verify Persisted Changes

Validate the actual persisted values after reopening the PO.

At minimum verify:

```text
PO Number = expected PO
Item = expected item
Quantity = expected updated quantity
Price = expected price
Description = expected description
Need-by Date = expected date
Ship-to = expected value
Supplier = expected supplier
Supplier Site = expected supplier site
```

The test must validate persisted business data, not only a success message.

### Step 22 — Generate Final Test Result

Produce a clear PASS/FAIL result.

The final validation must confirm:

1. Correct PO was identified.
2. Correct PO was opened.
3. Update/change order was successfully initiated.
4. Intended fields were updated.
5. Unintended critical fields were not changed.
6. Update/change order was successfully submitted.
7. PO/revision/change-order identifiers were captured.
8. Updated values persisted after reopening the PO.
9. Screenshots, traces, console information, and diagnostics are available when the test fails.

---

# Recommended Test Data

Create the test data as configurable variables rather than hard-coding Oracle master data.

```javascript
const updateOrderData = {
    poNumber: process.env.TEST_PO_NUMBER,

    supplier: process.env.TEST_SUPPLIER,
    supplierSite: process.env.TEST_SUPPLIER_SITE,
    procurementBU: process.env.TEST_PROCUREMENT_BU,
    buyer: process.env.TEST_BUYER,

    lineNumber: 1,
    item: process.env.TEST_ITEM,
    uom: 'Each',

    oldQuantity: 1,
    newQuantity: 2,

    oldPrice: 75000,
    newPrice: 75000,

    newNeedByDate: process.env.TEST_NEW_NEED_BY_DATE,

    shipToOrganization: process.env.TEST_SHIP_TO_ORG,
    shipToLocation: process.env.TEST_SHIP_TO_LOCATION,

    chargeAccount: process.env.TEST_CHARGE_ACCOUNT,

    updatedDescription: `AUTO_UPDATE_PO_${Date.now()}`
};
```

## Test Data Requirements

The source PO should:

* Exist before the test starts.
* Belong to the configured Procurement BU.
* Have a valid supplier and supplier site.
* Contain at least one editable PO line.
* Be in a status that permits the intended change.
* Have valid item/master data.
* Have valid schedule and distribution information.
* Be accessible by the automation user's Procurement role.
* Not be simultaneously modified by another test/user.

For parallel execution, use separate PO test data or an isolated data strategy.

---

# Recommended Playwright Test Scenarios

## Positive Scenarios

### UO-001 — Update PO Quantity

Change quantity from `1` to `2`.

Expected:

* Quantity update accepted.
* Change order submitted.
* Updated quantity persists.

### UO-002 — Update PO Price

Change the line price to a valid configured price.

Expected:

* New price persists after reopening the PO.

### UO-003 — Update PO Description

Change the PO header description.

Expected:

* New description persists.

### UO-004 — Update Need-by Date

Change the Need-by Date to a valid future date.

Expected:

* New date persists.

### UO-005 — Update Ship-to Location

Change the line's Ship-to Location to a valid configured location.

Expected:

* New location persists.

### UO-006 — Update Multiple Fields

Change quantity and description in the same change order.

Expected:

* Both changes persist.
* Unchanged critical fields remain unchanged.

### UO-007 — Update Multiple PO Lines

Update only the specified line among multiple PO lines.

Expected:

* Target line changes.
* Other lines remain unchanged.

### UO-008 — Submit Change Order for Approval

Submit an update when approval workflow is configured.

Expected:

* Appropriate workflow/submission status is displayed.

### UO-009 — Verify Updated PO

Search for the PO after submission and verify persisted values.

Expected:

* Exact PO is found.
* Updated values are present.

---

# Recommended Negative / Validation Scenarios

### UO-010 — Invalid Quantity

Enter an invalid quantity such as zero where prohibited.

Expected:

* Oracle validation is displayed.
* Submission is prevented.

### UO-011 — Negative Quantity

Enter a negative quantity.

Expected:

* Validation error.
* Update cannot be submitted.

### UO-012 — Invalid Need-by Date

Enter an invalid/past date when the configuration prohibits it.

Expected:

* Appropriate validation appears.

### UO-013 — Invalid Charge Account

Enter an invalid distribution/account combination.

Expected:

* Oracle validation prevents submission.

### UO-014 — Update Non-Editable PO

Attempt to update a PO whose status does not permit the selected change.

Expected:

* Update action is unavailable or Oracle displays the appropriate restriction.

### UO-015 — Cancel Update

Start a change order, modify a field, and cancel without submitting.

Expected:

* Change is not persisted.

### UO-016 — Exact PO Search Validation

Search for a PO number.

Expected:

* Automation opens only the exact matching PO rather than selecting an unrelated result.

---

# Recommended Playwright Test Architecture

Use a Page Object Model structure:

```text
oracle-playwright/
│
├── tests/
│   └── purchase-order/
│       ├── update-po.spec.js
│       ├── update-po-negative.spec.js
│       └── update-po-validation.spec.js
│
├── pages/
│   ├── LoginPage.js
│   ├── HomePage.js
│   ├── NavigatorPage.js
│   ├── ProcurementPage.js
│   ├── ManageOrdersPage.js
│   ├── PurchaseOrderPage.js
│   ├── POUpdatePage.js
│   ├── POLinePage.js
│   ├── POSchedulePage.js
│   └── PODistributionPage.js
│
├── fixtures/
│   └── test-fixtures.js
│
├── test-data/
│   └── update-order-data.js
│
├── utils/
│   ├── date-utils.js
│   ├── test-data-generator.js
│   ├── screenshot-utils.js
│   └── logger.js
│
├── config/
│   └── environment.config.js
│
├── playwright.config.js
└── package.json
```

# Page Object Responsibilities

## LoginPage

Implement:

```text
login()
enterUsername()
enterPassword()
clickSignIn()
verifyHomePage()
```

## HomePage

Implement:

```text
openNavigator()
verifyHomePage()
```

## NavigatorPage

Implement:

```text
openProcurement()
```

## ProcurementPage

Implement:

```text
openPurchaseOrders()
openManageOrders()
```

## ManageOrdersPage

Implement:

```text
searchByPONumber()
verifySearchResults()
openExactPO()
```

## PurchaseOrderPage

Implement:

```text
capturePODetails()
openActions()
startUpdate()
captureRevision()
openLine()
reviewPO()
submitUpdate()
captureSubmissionDetails()
```

## POUpdatePage

Implement:

```text
updateDescription()
verifyChangeOrderContext()
reviewChanges()
submitChangeOrder()
```

## POLinePage

Implement:

```text
getItem()
getQuantity()
updateQuantity()
getPrice()
updatePrice()
openSchedule()
verifyLine()
```

## POSchedulePage

Implement:

```text
getNeedByDate()
updateNeedByDate()
getShipToOrganization()
getShipToLocation()
updateShipToLocation()
verifySchedule()
```

## PODistributionPage

Implement:

```text
getChargeAccount()
updateChargeAccount()
verifyDistribution()
```

---

# Locator Strategy

Use Playwright's semantic locators wherever possible.

Preferred order:

1. `getByRole()`
2. `getByLabel()`
3. `getByPlaceholder()`
4. `getByText()`
5. Stable `data-testid`
6. CSS locator based on stable attributes
7. XPath only when no reliable alternative exists

Examples:

```javascript
page.getByRole('button', { name: /search/i })

page.getByLabel(/quantity/i)

page.getByLabel(/description/i)

page.getByText('Purchase Orders', { exact: true })
```

Do not depend on Oracle-generated IDs such as:

```text
pt1:_FOr1:1:...
```

or deeply nested absolute XPath expressions.

---

# Synchronization Rules

Do not use arbitrary fixed waits such as:

```javascript
await page.waitForTimeout(5000);
```

Instead:

* Wait for a specific page state.
* Wait for a button/control to become enabled.
* Wait for expected text to appear.
* Wait for a search result to become visible.
* Wait for navigation/page readiness.
* Use Playwright's auto-waiting wherever possible.

For Oracle pages with asynchronous processing, create reusable helper methods such as:

```text
waitForPageReady()
waitForSearchResults()
waitForSaveCompletion()
waitForSubmissionStatus()
waitForEditableState()
```

---

# Runtime Business-ID Strategy

Never rely only on static test data after an update.

Capture runtime values such as:

```text
PO_NUMBER
REVISION
CHANGE_ORDER_NUMBER
STATUS
```

Use the captured PO number to perform the final verification.

The preferred flow is:

```text
Create/Prepare PO
       ↓
Capture PO Number
       ↓
Search PO
       ↓
Update PO
       ↓
Submit Change Order
       ↓
Capture Revision / Change Order Number
       ↓
Search PO again
       ↓
Verify persisted changes
```

---

# Failure Diagnostics

Configure Playwright to collect:

* Screenshot on failure
* Trace on retry/failure
* Video when required
* Console errors
* Test logs
* Current URL
* Relevant business identifiers
* Oracle validation/error messages

The test report should clearly identify the failed screen and business operation.

---

# Final Implementation Requirement

Generate the Playwright automation using the above **22-step business flow**.

The implementation must:

* Use Page Object Model.
* Keep test data externalized.
* Avoid hard-coded Oracle-generated element IDs.
* Avoid arbitrary `waitForTimeout()` calls.
* Use robust semantic locators.
* Capture PO Number and revision/change-order identifiers dynamically.
* Validate both the **before** and **after** state.
* Verify persisted data after reopening the PO.
* Support positive and negative scenarios.
* Provide meaningful assertions.
* Produce useful failure diagnostics.
* Never invent supplier, supplier-site, BU, item, location, account, or other Oracle master data.
* Treat Oracle UI labels as environment-dependent where appropriate.
* Make the framework maintainable for future Oracle Cloud UI/release changes.
