# AI Prompt: Oracle Cloud SaaS Update Purchase Requisition Automation Using Playwright

Act as a **Senior Oracle Cloud SaaS Procurement Automation Engineer, Oracle Fusion Functional Consultant, and Playwright Test Architect**.

Create a production-ready **Playwright automation framework and test scenarios** for updating an existing **Purchase Requisition** in Oracle Cloud SaaS Procurement.

The automation must cover the complete UI business flow from login through final verification. Oracle Fusion UI labels and navigation can vary depending on the Oracle release, Redwood/classic UI, user role, privileges, and configuration. Therefore, identify the equivalent UI control where necessary rather than assuming a single fixed label.

Do not invent Oracle master data. Use configurable test data for Procurement BU, requester, item, supplier, location, organization, charge account, and other environment-specific values.

---

# 22-Step Business Flow

## Step 1 — Login to Oracle Cloud

1. Launch the configured Oracle Cloud SaaS URL.
2. Enter the automation username.
3. Enter the automation password.
4. Click **Sign In**.
5. Wait for the Oracle Cloud Home page.
6. Verify successful login.

---

## Step 2 — Open Navigator

1. Locate **Navigator**.
2. Click Navigator.
3. Wait for the navigation panel/menu.
4. Verify that Procurement is available.

---

## Step 3 — Navigate to Procurement

1. Select **Procurement**.
2. Wait for the Procurement work area.
3. Verify that Procurement navigation options are displayed.

---

## Step 4 — Open Purchase Requisitions

1. Locate the Purchase Requisition functionality.
2. Open **Purchase Requisitions**, **Manage Requisitions**, or the equivalent configured page.
3. Wait for the page to load.
4. Verify that requisition search/management controls are available.

---

## Step 5 — Search for the Existing Requisition

1. Retrieve the test Requisition Number from test data or a fixture.
2. Enter the Requisition Number.
3. Click **Search**.
4. Wait for the search results.
5. Verify that the expected requisition is returned.
6. Match the exact Requisition Number.

Do not select the first result without validating the business identifier.

---

## Step 6 — Open and Capture Existing Requisition Details

Open the exact requisition and capture the original values:

* Requisition Number
* Requester
* Status
* Description
* Procurement BU, where displayed
* Item
* Line Number
* Quantity
* Price
* Currency
* UOM
* Need-by Date
* Deliver-to Organization
* Deliver-to Location
* Supplier/Supplier Site, where applicable
* Charge Account
* Project/Task, where applicable

Store these values as the **before-update state**.

---

## Step 7 — Start Requisition Update

1. Open the available Actions/options menu.
2. Select the applicable **Edit**, **Update**, or **Edit Requisition** action.
3. Wait for the requisition to become editable.
4. Verify that the expected fields are enabled.

If the requisition cannot be edited because of its status or security configuration, record the Oracle message and handle it as a validation/negative scenario.

---

## Step 8 — Update Requisition Header

1. Navigate to the requisition header.
2. Locate the Description field.
3. Capture the original description.
4. Enter a unique updated description.
5. Verify the new description.

Use dynamically generated data, for example:

`AUTO_REQ_UPDATE_<timestamp>`

Do not modify unrelated header fields.

---

## Step 9 — Open Requisition Lines

1. Navigate to the Lines section.
2. Identify the target line using Line Number and/or Item.
3. Open/select the target line.
4. Verify the existing Item.
5. Verify Quantity.
6. Verify Price.
7. Verify UOM.

For multiple-line requisitions, do not depend solely on row position.

---

## Step 10 — Update Requisition Quantity

1. Capture the original quantity.
2. Locate the Quantity field.
3. Enter the configured new quantity.
4. Example: change quantity from `1` to `2`.
5. Verify the updated quantity.
6. Continue only after the UI reflects the expected value.

---

## Step 11 — Update Requisition Price

If price modification is supported and included in the scenario:

1. Capture the original price.
2. Enter the configured new price.
3. Verify the updated price.

If price is not part of the scenario, do not modify it. Verify that it remains unchanged.

---

## Step 12 — Update Delivery Details

Navigate to the delivery section and verify/update:

* Need-by Date
* Deliver-to Organization
* Deliver-to Location
* Delivery Method, where applicable

If the scenario requires a date change:

1. Capture the original date.
2. Enter a valid future date.
3. Verify the new date.

Use environment-configured delivery organization/location values.

---

## Step 13 — Update Accounting / Distribution

Open the Billing, Accounting, or Distribution section as applicable.

Verify:

* Charge Account
* Cost Center
* Project
* Task
* Expenditure Organization
* Other configured accounting attributes

Only change accounting information when explicitly required by the scenario.

---

## Step 14 — Verify Supplier Information

Where supplier information is available on the requisition:

1. Verify Supplier.
2. Verify Supplier Site.
3. Verify related supplier information.
4. Change supplier information only if the test scenario specifically requires it.

Use valid environment-specific supplier master data.

---

## Step 15 — Validate Before Submission

Perform a before/after comparison.

Example:

```text
Requisition Number  = unchanged
Item                = unchanged
UOM                 = unchanged

Old Quantity        = 1
New Quantity        = 2

Old Price           = 75000
New Price           = 75000

Description         = updated
Need-by Date        = expected value
Deliver-to Location = expected value
Charge Account      = unchanged
```

Verify that only the intended fields have changed.

---

## Step 16 — Review Updated Requisition

Navigate to the Review/Summary section.

Validate:

* Requisition header
* Lines
* Item
* Quantity
* Price
* UOM
* Delivery
* Need-by Date
* Supplier
* Accounting
* Description

Capture a screenshot at this stage when configured by the test framework.

---

## Step 17 — Submit Updated Requisition

1. Click **Submit** or the equivalent action.
2. Wait for Oracle processing.
3. Verify the confirmation message.
4. Capture the resulting requisition status.

Do not assume a specific status because approval workflow configuration can vary.

---

## Step 18 — Capture Submission Details

Capture all available business identifiers:

* Requisition Number
* Status
* Confirmation message
* Workflow/reference information, if available

Store these values in the Playwright test context.

---

## Step 19 — Navigate Back to Manage Requisitions

1. Return to the Purchase Requisitions/Manage Requisitions page.
2. Clear previous search criteria where necessary.
3. Prepare to search using the captured Requisition Number.

---

## Step 20 — Search and Reopen Updated Requisition

1. Enter the captured Requisition Number.
2. Click Search.
3. Wait for the results.
4. Match the exact requisition.
5. Open it.

Do not rely on the first returned row.

---

## Step 21 — Verify Persisted Changes

Verify the actual persisted values after reopening the requisition.

At minimum validate:

```text
Requisition Number = expected
Item               = expected
Quantity           = expected new quantity
Price              = expected price
Description        = expected updated description
Need-by Date       = expected date
Deliver-to         = expected value
Supplier           = expected value
Charge Account     = expected value
```

Also verify that critical fields not included in the update remain unchanged.

---

## Step 22 — Generate Final PASS/FAIL Result

The automation must provide a final business-level result confirming:

1. Correct requisition was found.
2. Correct requisition was opened.
3. Update mode was successfully initiated.
4. Intended fields were changed.
5. Unintended critical fields were not changed.
6. Updated requisition was submitted.
7. Requisition Number/status were captured.
8. Requisition was reopened after submission.
9. Updated values persisted.
10. Failure diagnostics are available if any step fails.

Generate a clear test report with the failed screen/action when applicable.

---

# Recommended Test Scenarios

## Positive Scenarios

### REQ-UPD-001 — Update Quantity

Change:

```text
Quantity: 1 → 2
```

Expected result:

* Update accepted.
* Requisition submitted.
* New quantity persists after reopening.

### REQ-UPD-002 — Update Price

Change the line price to a valid configured value.

Expected:

* Updated price persists.

### REQ-UPD-003 — Update Description

Change the requisition description.

Expected:

* Updated description persists.

### REQ-UPD-004 — Update Need-by Date

Change the Need-by Date to a valid future date.

Expected:

* Updated date persists.

### REQ-UPD-005 — Update Deliver-to Location

Change to a valid configured location.

Expected:

* New location persists.

### REQ-UPD-006 — Update Multiple Fields

Update quantity and description together.

Expected:

* Both intended changes persist.
* Unchanged fields remain unchanged.

### REQ-UPD-007 — Update One Line in Multi-Line Requisition

Update only line 2 of a multi-line requisition.

Expected:

* Line 2 changes.
* Other lines remain unchanged.

### REQ-UPD-008 — Update Accounting

Change a valid configured charge account.

Expected:

* New accounting information persists.

### REQ-UPD-009 — Submit for Approval

Update a requisition requiring approval.

Expected:

* Appropriate Oracle workflow status is displayed.

### REQ-UPD-010 — Verify Persistence

Search for the requisition after submission.

Expected:

* Correct requisition is found.
* Updated values are persisted.

---

# Negative / Validation Scenarios

### REQ-UPD-011 — Quantity = Zero

Expected:

* Oracle validation is displayed.
* Submission is prevented if zero is invalid.

### REQ-UPD-012 — Negative Quantity

Expected:

* Validation error.
* Requisition cannot be submitted.

### REQ-UPD-013 — Invalid Need-by Date

Enter a date that violates configured business rules.

Expected:

* Appropriate validation appears.

### REQ-UPD-014 — Invalid Charge Account

Enter an invalid accounting combination.

Expected:

* Oracle prevents submission.

### REQ-UPD-015 — Update Non-Editable Requisition

Attempt to update a requisition in a status that does not permit editing.

Expected:

* Edit/update action is unavailable, or
* Oracle displays the applicable restriction.

### REQ-UPD-016 — Cancel Update

Modify a field and cancel without submitting.

Expected:

* Original requisition remains unchanged.

### REQ-UPD-017 — Exact Search Validation

Search using a requisition number.

Expected:

* Only the exact business record is opened.

---

# Suggested Playwright Project Structure

```text
oracle-playwright/
│
├── tests/
│   └── purchase-requisition/
│       ├── update-requisition.spec.js
│       ├── update-requisition-negative.spec.js
│       └── update-requisition-validation.spec.js
│
├── pages/
│   ├── LoginPage.js
│   ├── HomePage.js
│   ├── NavigatorPage.js
│   ├── ProcurementPage.js
│   ├── ManageRequisitionsPage.js
│   ├── RequisitionPage.js
│   ├── RequisitionLinePage.js
│   ├── RequisitionDeliveryPage.js
│   └── RequisitionAccountingPage.js
│
├── fixtures/
│   └── test-fixtures.js
│
├── test-data/
│   └── requisition-update-data.js
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

---

# Recommended Page Object Responsibilities

## LoginPage.js

```text
login()
enterUsername()
enterPassword()
clickSignIn()
verifyHomePage()
```

## HomePage.js

```text
openNavigator()
verifyHomePage()
```

## NavigatorPage.js

```text
openProcurement()
```

## ProcurementPage.js

```text
openPurchaseRequisitions()
openManageRequisitions()
```

## ManageRequisitionsPage.js

```text
searchByRequisitionNumber()
verifySearchResults()
openExactRequisition()
```

## RequisitionPage.js

```text
captureRequisitionDetails()
openActions()
startUpdate()
updateDescription()
openLine()
reviewRequisition()
submitRequisition()
captureRequisitionNumber()
captureStatus()
```

## RequisitionLinePage.js

```text
selectLine()
getItem()
getQuantity()
updateQuantity()
getPrice()
updatePrice()
getUOM()
openDelivery()
openAccounting()
```

## RequisitionDeliveryPage.js

```text
getNeedByDate()
updateNeedByDate()
getDeliverToOrganization()
getDeliverToLocation()
updateDeliverToLocation()
verifyDelivery()
```

## RequisitionAccountingPage.js

```text
getChargeAccount()
updateChargeAccount()
getCostCenter()
getProject()
verifyAccounting()
```

---

# Locator Strategy

Use the following locator priority for Oracle Cloud UI automation:

## 1. Role-Based Locators

Preferred for buttons, links, tabs, and other semantic controls.

```javascript
page.getByRole('button', { name: /search/i })

page.getByRole('button', { name: /submit/i })

page.getByRole('link', { name: /purchase requisitions/i })
```

## 2. Label-Based Locators

Preferred for form fields.

```javascript
page.getByLabel(/quantity/i)

page.getByLabel(/description/i)

page.getByLabel(/need-by date/i)
```

## 3. Placeholder-Based Locators

Use when the placeholder is stable.

```javascript
page.getByPlaceholder(/search/i)
```

## 4. Text Locators

Useful for navigation/menu items.

```javascript
page.getByText('Procurement', { exact: true })

page.getByText('Purchase Requisitions', { exact: true })
```

## 5. Stable Test IDs

If your Oracle automation environment provides custom stable attributes:

```javascript
page.getByTestId('requisition-number')
page.getByTestId('requisition-quantity')
```

Prefer stable custom attributes over generated Oracle IDs.

## 6. Stable CSS Attributes

Use only when semantic locators are unavailable.

Avoid selectors based on dynamic classes or deeply nested DOM structures.

## 7. XPath — Last Resort

Use XPath only when there is no reliable semantic/stable locator.

Avoid:

```text
absolute XPath
deep XPath
generated Oracle component IDs
session-specific IDs
```

---

# Oracle UI Automation Rules

The generated Playwright implementation must follow these rules:

### Do not use arbitrary waits

Avoid:

```javascript
await page.waitForTimeout(5000);
```

Use Playwright's auto-waiting and state-based assertions instead.

### Do not depend on generated Oracle IDs

Avoid selectors similar to:

```text
#pt1:_FOr1:1:...
```

because generated IDs may change.

### Use business identifiers

Capture and reuse:

```text
REQUISITION_NUMBER
STATUS
LINE_NUMBER
```

for validation.

### Validate exact records

Never assume the first search result is the correct requisition.

### Validate before and after state

The test should know:

```text
Before:
Quantity = 1

After:
Quantity = 2
```

and verify both values.

### Validate persistence

A successful toast/message is not sufficient.

Reopen the requisition and verify the actual saved values.

### Externalize test data

Keep environment-specific master data outside page objects:

```text
Supplier
Supplier Site
Requester
Procurement BU
Item
Location
Organization
Charge Account
```

### Handle Oracle workflow variability

Do not assume that every environment will immediately show `Approved`.

The expected status should be configurable according to the test environment.

### Failure diagnostics

Configure Playwright to capture:

* Screenshot
* Trace
* Video where required
* Console errors
* Current URL
* Oracle validation message
* Requisition Number
* Failed step/screen

---

# Expected Automation Flow

The generated test should ultimately implement this business flow:

```text
Login
  ↓
Navigator
  ↓
Procurement
  ↓
Purchase Requisitions
  ↓
Manage Requisitions
  ↓
Search Requisition
  ↓
Open Exact Requisition
  ↓
Capture Before State
  ↓
Edit / Update
  ↓
Update Required Field
  ↓
Review
  ↓
Submit
  ↓
Capture Requisition Number / Status
  ↓
Search Again
  ↓
Open Requisition
  ↓
Validate Persisted Changes
  ↓
Validate Unchanged Data
  ↓
PASS / FAIL
```

Generate the implementation using **Playwright Test + JavaScript/TypeScript + Page Object Model**, with maintainable locators, reusable methods, externalized test data, robust synchronization, meaningful assertions, and comprehensive failure diagnostics.
