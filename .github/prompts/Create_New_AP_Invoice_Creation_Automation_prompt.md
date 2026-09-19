# AI Prompt: Oracle Cloud SaaS AP Invoice Creation — Playwright Automation

Act as a **Senior Oracle Fusion Cloud SaaS Payables Functional Consultant and Playwright Automation Architect**.

Create a robust, reusable Playwright automation solution for **AP Invoice Creation in Oracle Fusion Cloud SaaS**, preferably using an existing eligible **Purchase Order (PO)** and **Receipt** for a PO-matched invoice scenario.

The automation must follow the Oracle business flow:

**Supplier → Purchase Order → Receipt → AP Invoice → Invoice Validation**

Oracle UI labels can vary depending on the release, Redwood/classic UI, user role, and Payables configuration. Use the actual accessible labels available in the environment and do not invent Oracle-generated IDs, transaction numbers, master data, or UI controls.

## 22-Step AP Invoice Creation Automation Flow

### Step 1 — Login

Navigate to the Oracle Cloud login page.

* Enter username.
* Enter password.
* Click Sign In.
* Wait for the Oracle Home page.
* Verify successful login.

### Step 2 — Open Navigator

* Click Navigator.
* Wait for the navigation menu.
* Verify Payables is available.

### Step 3 — Open Payables

* Select Payables.
* Wait for the Payables work area.
* Verify the Payables page is loaded.

### Step 4 — Open Invoices

Navigate to the invoice functionality.

Possible labels include:

* Invoices
* Manage Invoices
* Create Invoice
* Invoice Work Area

Use the option available in the environment.

### Step 5 — Start Invoice Creation

Open **Create Invoice**.

Verify that the invoice-entry screen is displayed and required header fields are available.

### Step 6 — Enter Business Unit

Select the required Payables/Business Unit.

Capture:

`BUSINESS_UNIT`

Verify that the selected business unit is the expected one.

### Step 7 — Enter Supplier and Supplier Site

Select:

* Supplier
* Supplier Site

Capture:

`SUPPLIER`

`SUPPLIER_SITE`

Verify that the supplier site belongs to the selected supplier.

### Step 8 — Enter Invoice Number and Dates

Enter:

* Invoice Number
* Invoice Date
* Accounting Date, if required

Generate a unique invoice number for automation.

Example:

`AUTO-INV-<timestamp>`

Store it as:

`INVOICE_NUMBER`

### Step 9 — Enter Currency and Invoice Amount

Enter or verify:

* Currency
* Invoice Amount

Example:

`Currency = INR`

`Invoice Amount = 5000`

Verify that the amount is greater than zero and consistent with the invoice lines.

### Step 10 — Enter Invoice Header Details

Populate applicable fields such as:

* Description
* Payment Terms
* Terms Date
* Legal Entity, where applicable
* Additional supplier invoice information

Use only values configured in the environment.

### Step 11 — Match Invoice to Purchase Order

Initiate PO matching.

Search using:

`PO_NUMBER`

Verify:

* PO Number
* Supplier
* Supplier Site
* PO Line
* Item
* Ordered Quantity
* Received Quantity
* Available quantity for invoicing

Do not select a PO solely based on row position.

### Step 12 — Select PO Line

Select the required PO line.

Capture:

`PO_LINE_NUMBER`

`ITEM`

`PO_QUANTITY`

`RECEIVED_QUANTITY`

`UNIT_PRICE`

Verify that the line is eligible for invoicing.

### Step 13 — Match to Receipt

If the environment uses receipt-based/3-way matching:

Search for and select:

`RECEIPT_NUMBER`

Verify:

* Receipt Number
* PO Number
* PO Line
* Item
* Receipt Quantity

Ensure that the invoice quantity does not exceed the applicable receivable/invoiceable quantity unless the test specifically targets tolerance behavior.

### Step 14 — Enter/Verify Invoice Line

Enter or verify:

* Line Type
* Item/Description
* Quantity
* Unit Price
* Line Amount
* PO Line
* Tax Classification, where applicable

Validate:

`Quantity × Unit Price = Line Amount`

where applicable.

### Step 15 — Validate Tax Details

Review applicable tax information.

Validate fields such as:

* Tax Classification
* Tax Code
* Tax Rate
* Tax Amount

Do not hard-code tax values unless they are explicitly part of the test data.

### Step 16 — Validate Accounting / Distribution

Review or enter invoice distribution information.

Validate applicable:

* Distribution Type
* Account
* Cost Center
* Department
* Project
* Task
* Distribution Amount

Ensure that distribution amounts reconcile with the invoice amount.

### Step 17 — Review Invoice

Before saving/submitting, verify:

* Business Unit
* Supplier
* Supplier Site
* Invoice Number
* Invoice Date
* Accounting Date
* Currency
* Invoice Amount
* PO Number
* PO Line
* Receipt Number
* Invoice Quantity
* Unit Price
* Tax
* Distribution

Check for visible validation errors.

### Step 18 — Save/Submit Invoice

Use the action available in the environment, such as:

* Save
* Save and Close
* Submit
* Complete

Wait for Oracle to finish processing.

Do not use arbitrary fixed waits.

### Step 19 — Validate Invoice

If explicit Payables invoice validation is required:

* Open invoice actions.
* Select Validate.
* Wait for validation processing.
* Verify the resulting invoice status.

Capture any validation errors or holds.

### Step 20 — Capture Invoice Transaction Details

Capture the invoice information at runtime.

At minimum:

`INVOICE_NUMBER`

Also capture, where available:

`INVOICE_ID`

`INVOICE_STATUS`

Do not hard-code Oracle-generated identifiers.

### Step 21 — Search and Reopen Invoice

Navigate to the invoice search/manage page.

Search using:

`INVOICE_NUMBER`

Open the invoice.

Verify:

* Invoice Number
* Supplier
* Supplier Site
* Business Unit
* Invoice Date
* Currency
* Invoice Amount
* PO Number
* PO Line
* Receipt Number
* Invoice Quantity
* Invoice Status

### Step 22 — Final End-to-End Validation

Perform the final business-level validation.

The test should return **PASS** only when:

1. Login succeeded.
2. Correct Payables BU was selected.
3. Correct supplier and site were selected.
4. Invoice was created successfully.
5. Correct PO was matched.
6. Correct PO line was selected.
7. Correct receipt was matched where applicable.
8. Invoice amount and quantity are correct.
9. Invoice validation completed with the expected status.
10. The invoice can be searched and reopened.
11. Persisted invoice information matches the expected test data.

Otherwise return **FAIL** with:

* Failed step
* Expected result
* Actual result
* Oracle validation/error message
* Screenshot/trace reference

---

# Recommended First Automation Scenario

## AP-INV-001 — Create PO-Matched AP Invoice

Create a standard PO-matched AP invoice using an existing eligible PO and receipt.

### Test Data

```text
Business Unit      = Existing Payables BU
Supplier           = Existing supplier
Supplier Site      = Existing supplier site
PO Number          = Existing eligible PO
PO Line            = 1
Receipt Number     = Existing receipt
Currency           = INR
PO Quantity        = 10
Receipt Quantity   = 5
Invoice Quantity   = 5
Unit Price         = 1,000
Invoice Amount     = 5,000
Invoice Number     = Unique runtime value
```

### Objective

Verify that a user can:

1. Create an AP invoice.
2. Match it to an existing PO.
3. Match the invoice to an existing receipt where configured.
4. Save/submit the invoice.
5. Validate the invoice.
6. Search for the invoice afterward.
7. Verify that the persisted invoice information is correct.

---

# Recommended Automation Flow

Implement the first test using this sequence:

```text
Login
  ↓
Navigator
  ↓
Payables
  ↓
Invoices
  ↓
Create Invoice
  ↓
Business Unit
  ↓
Supplier
  ↓
Supplier Site
  ↓
Invoice Number / Dates
  ↓
Currency / Amount
  ↓
Match PO
  ↓
Select PO Line
  ↓
Match Receipt
  ↓
Invoice Line
  ↓
Tax
  ↓
Accounting / Distribution
  ↓
Review
  ↓
Save / Submit
  ↓
Validate Invoice
  ↓
Capture Invoice Number / Status
  ↓
Search Invoice
  ↓
Open Invoice
  ↓
Validate Persisted Data
```

The automation should maintain the relationship:

```text
SUPPLIER
   ↓
PO_NUMBER
   ↓
PO_LINE_NUMBER
   ↓
RECEIPT_NUMBER
   ↓
INVOICE_NUMBER
   ↓
INVOICE_STATUS
```

---

# Primary Assertions

The Playwright test must validate the following business data.

### 1. Supplier Assertion

```text
Actual Supplier = Expected Supplier
```

### 2. Supplier Site Assertion

```text
Actual Supplier Site = Expected Supplier Site
```

### 3. Business Unit Assertion

```text
Actual Business Unit = Expected Business Unit
```

### 4. Invoice Number Assertion

```text
Actual Invoice Number = Generated INVOICE_NUMBER
```

The invoice number should be generated/captured dynamically rather than hard-coded.

### 5. Currency Assertion

```text
Actual Currency = Expected Currency
```

For the initial example:

```text
INR = INR
```

### 6. Invoice Amount Assertion

```text
Actual Invoice Amount = Expected Invoice Amount
```

Example:

```text
5000 = 5000
```

### 7. PO Assertion

```text
Invoice PO Number = Expected PO Number
```

### 8. PO Line Assertion

```text
Invoice PO Line = Expected PO Line
```

### 9. Receipt Assertion

Where receipt matching is applicable:

```text
Invoice Receipt Number = Expected Receipt Number
```

### 10. Invoice Quantity Assertion

```text
Actual Invoice Quantity = Expected Invoice Quantity
```

Example:

```text
5 = 5
```

### 11. Unit Price Assertion

```text
Actual Unit Price = Expected Unit Price
```

Example:

```text
1000 = 1000
```

### 12. Line Amount Assertion

Where applicable:

```text
Quantity × Unit Price = Line Amount
```

Example:

```text
5 × 1000 = 5000
```

### 13. Tax Assertion

Verify the calculated/entered tax according to the configured test data.

Do not assume a particular tax amount unless it is defined by the test scenario.

### 14. Distribution Assertion

Verify that the invoice distribution/accounting information is valid and reconciles with the invoice.

### 15. Invoice Status Assertion

After validation:

```text
Actual Invoice Status = Expected Status
```

The expected status must be based on the environment's configured Payables workflow.

### 16. Persistence Assertion

After searching the invoice again:

```text
Invoice exists in Manage/Search Invoices = true
```

### 17. End-to-End Relationship Assertion

Finally validate:

```text
Supplier
   ↓
PO
   ↓
Receipt
   ↓
AP Invoice
```

The invoice must reference the expected purchasing and receiving transactions.

---

# Playwright Implementation Rules

Use Page Object Model and keep selectors inside Page Objects.

Recommended Page Objects:

```text
LoginPage.js
HomePage.js
NavigatorPage.js
PayablesPage.js
InvoicesPage.js
CreateInvoicePage.js
InvoiceMatchPage.js
InvoiceLinePage.js
InvoiceDistributionPage.js
InvoiceValidationPage.js
ManageInvoicesPage.js
```

Maintain runtime variables:

```javascript
let INVOICE_NUMBER;
let INVOICE_ID;
let PO_NUMBER;
let PO_LINE_NUMBER;
let RECEIPT_NUMBER;
let INVOICE_AMOUNT;
let INVOICE_QUANTITY;
```

Use business-level assertions rather than relying only on a success toast.

The final automation should prove that the invoice was **created, validated, persisted, searchable, and correctly associated with the expected PO and receipt**.
