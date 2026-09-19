# AI Prompt: Oracle Cloud SaaS Purchase Receipt Creation — Playwright Automation

Act as a **Senior Oracle Fusion Cloud SaaS Procurement/Receiving Functional Consultant and Playwright Automation Architect**.

Create a production-ready Playwright automation solution for creating a **Purchase Receipt in Oracle Fusion Cloud SaaS** against an existing eligible Purchase Order (PO).

In Oracle Fusion Cloud, Purchase Receipt functionality may be presented using terminology such as **Receiving, Receipts, Receive Expected Shipments, My Receipts, or Receiving Work Area**. The exact labels may vary based on the Oracle release, Redwood/classic UI, user role, and receiving configuration.

Do not invent Oracle master data, UI labels, generated IDs, PO numbers, or receipt numbers. Use values supplied by the test environment and capture Oracle-generated transaction numbers at runtime.

## 22-Step Purchase Receipt Automation Flow

### Step 1 — Login

Navigate to the Oracle Cloud login page.

* Enter username.
* Enter password.
* Click Sign In.
* Wait for the Oracle Home page.
* Verify successful authentication.

### Step 2 — Open Navigator

* Click Navigator.
* Wait for the navigation menu.
* Verify Procurement is available.

### Step 3 — Open Procurement

* Select Procurement.
* Wait for the Procurement work area.
* Verify the Procurement page has loaded.

### Step 4 — Open Receiving

Navigate to the receiving functionality.

Handle environment-specific labels such as:

* Receiving
* Receipts
* Receiving Work Area
* Receive Expected Shipments
* My Receipts

Do not assume a single hard-coded menu label if the environment uses another valid label.

### Step 5 — Open Receive Expected Shipments

Open the page used to receive goods against an expected shipment/PO.

Verify that the search/filter area is displayed before continuing.

### Step 6 — Search for Existing PO

Search using the test PO number.

Capture/use:

`PO_NUMBER`

Optionally validate using:

* Supplier
* Supplier Site
* Item
* Receiving Organization

### Step 7 — Validate PO Search Results

Verify that the expected PO is displayed.

Validate:

* PO Number
* Supplier
* Supplier Site
* PO Line
* Item
* Ordered Quantity
* Previously Received Quantity
* Remaining Quantity
* Receiving Organization/Location

Do not select the first result blindly.

### Step 8 — Select PO Line

Select the intended PO line.

Capture:

`PO_LINE_NUMBER`

Also capture:

`ITEM`

`ORDERED_QUANTITY`

`REMAINING_QUANTITY`

Verify that the selected line is eligible for receiving.

### Step 9 — Enter Receipt Quantity

Enter the quantity to receive.

For the initial automation scenario, use a partial receipt where supported.

Example:

`Ordered Quantity = 10`

`Receipt Quantity = 5`

Validate that the receipt quantity is valid for the PO configuration.

### Step 10 — Enter Receiving Details

Populate applicable receiving information.

Possible fields include:

* Receipt Quantity
* UOM
* Destination Type
* Receiving Organization
* Subinventory
* Locator
* Deliver-to Location

Only interact with fields that exist and are required by the environment.

### Step 11 — Configure Receipt Routing

Handle the configured receiving routing.

Possible options include:

* Direct Delivery
* Standard Receipt
* Inspection Required

Verify that the selected routing matches the expected test configuration.

### Step 12 — Handle Lot/Serial Details

If the item requires lot or serial tracking:

* Enter valid lot information, or
* Enter valid serial number(s).
* Ensure the total controlled quantity matches the receipt quantity.

If the item is not lot/serial controlled, safely skip this step.

### Step 13 — Enter Transaction Information

Enter applicable receipt information such as:

* Receipt Date
* Packing Slip
* Shipment Number
* Carrier
* Comments

Generate unique test values where required by the application.

### Step 14 — Review Receipt

Before submission, verify:

* PO Number
* PO Line
* Supplier
* Item
* Receipt Quantity
* UOM
* Receiving Organization
* Destination
* Receipt Routing
* Lot/Serial details where applicable

Check for mandatory-field or validation errors.

### Step 15 — Submit Receipt

Click the appropriate Oracle action, which may be:

* Submit
* Receive
* Create Receipt

Wait for the transaction to complete using state-based synchronization.

Do not use arbitrary fixed delays.

### Step 16 — Capture Receipt Number

After successful submission, capture the Oracle-generated receipt number.

Store it as:

`RECEIPT_NUMBER`

Never hard-code the receipt number.

### Step 17 — Validate Receipt Confirmation

Verify that Oracle reports successful receipt creation.

Validate:

* Receipt creation completed.
* Receipt number is displayed.
* No blocking error is present.

Capture screenshot/trace information if the transaction fails.

### Step 18 — Navigate to Receipts

Navigate to the receipt search/manage area.

Possible labels:

* Receipts
* Manage Receipts
* My Receipts
* Receiving Transactions

Verify that the receipt search page is loaded.

### Step 19 — Search Created Receipt

Search using the runtime-generated:

`RECEIPT_NUMBER`

Do not hard-code the receipt number.

Verify that the receipt appears in the results.

### Step 20 — Open Receipt Details

Open the created receipt.

Verify:

* Receipt Number
* PO Number
* Supplier
* PO Line
* Item
* Receipt Quantity
* Receipt Date
* Organization
* Destination

Also verify lot/serial information when applicable.

### Step 21 — Validate Persisted Business Data

Compare the created receipt with the original test data.

Verify:

`PO_NUMBER = Expected PO`

`PO_LINE_NUMBER = Expected PO Line`

`ITEM = Expected Item`

`RECEIPT_QUANTITY = Expected Quantity`

`RECEIPT_NUMBER = Generated Receipt Number`

Verify that the receipt persisted successfully in Oracle.

### Step 22 — Final PASS/FAIL Validation

Return **PASS** only when:

* Login succeeded.
* Correct PO was found.
* Correct PO line was selected.
* Receipt quantity was entered successfully.
* Required receiving information was accepted.
* Receipt was created.
* Receipt number was captured.
* Receipt can be searched after creation.
* Persisted receipt data matches expected values.

Otherwise return **FAIL** with:

* Failed step
* Expected result
* Actual result
* Oracle error/validation message
* Screenshot/trace reference

---

# Recommended Playwright Project Structure

Use a Page Object Model with separate test, page, data, and utility layers.

```text
oracle-playwright/
│
├── tests/
│   └── receiving/
│       ├── create-purchase-receipt.spec.js
│       ├── create-purchase-receipt-negative.spec.js
│       └── purchase-receipt-validation.spec.js
│
├── pages/
│   ├── LoginPage.js
│   ├── HomePage.js
│   ├── NavigatorPage.js
│   ├── ProcurementPage.js
│   ├── ReceivingPage.js
│   ├── ReceiveExpectedShipmentsPage.js
│   ├── ReceiptDetailsPage.js
│   ├── LotSerialPage.js
│   └── ManageReceiptsPage.js
│
├── fixtures/
│   └── test-fixtures.js
│
├── test-data/
│   └── purchase-receipt-data.js
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

## Page Object Responsibilities

### `LoginPage.js`

```text
login()
enterUsername()
enterPassword()
clickSignIn()
verifyLoginSuccess()
```

### `HomePage.js`

```text
openNavigator()
verifyHomePage()
```

### `NavigatorPage.js`

```text
openProcurement()
```

### `ProcurementPage.js`

```text
openReceiving()
```

### `ReceivingPage.js`

```text
openReceiveExpectedShipments()
searchPurchaseOrder()
verifyReceivingPage()
```

### `ReceiveExpectedShipmentsPage.js`

```text
searchPO()
verifyPO()
selectPOLine()
enterReceiptQuantity()
enterReceivingDetails()
selectReceiptRouting()
openLotSerialDetails()
enterTransactionDetails()
reviewReceipt()
submitReceipt()
captureReceiptNumber()
```

### `ReceiptDetailsPage.js`

```text
verifyPONumber()
verifyPOLine()
verifyItem()
verifyReceiptQuantity()
verifyOrganization()
verifyDestination()
verifyLotSerialDetails()
```

### `ManageReceiptsPage.js`

```text
searchReceipt()
openReceipt()
verifyReceipt()
```

---

# Recommended Test Data Structure

Keep Oracle environment data outside the test implementation.

Example:

```javascript
const purchaseReceiptData = {
    poNumber: process.env.PO_NUMBER,
    poLineNumber: process.env.PO_LINE_NUMBER,
    receiptQuantity: 5,
    receivingOrganization: process.env.RECEIVING_ORG,
    destinationLocation: process.env.DESTINATION_LOCATION,
    receiptRouting: process.env.RECEIPT_ROUTING
};
```

Runtime transaction values should be stored separately:

```javascript
let receiptNumber;
let item;
let orderedQuantity;
let remainingQuantity;
```

---

# Locator Strategy

Use the following locator priority:

```text
1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. Stable CSS selector
7. XPath — last resort
```

## Preferred Examples

```javascript
page.getByRole('button', { name: /search/i })

page.getByRole('button', { name: /submit/i })

page.getByLabel('Purchase Order')

page.getByLabel('Receipt Quantity')

page.getByPlaceholder(/search/i)

page.getByText('Receive Expected Shipments', { exact: true })
```

If Oracle provides stable application-specific attributes such as `data-testid`, prefer those over fragile DOM traversal.

## Avoid Oracle-Generated IDs

Do not build tests around IDs such as:

```text
#pt1:_FOr1:1:...
```

These can change between sessions, environments, or UI implementations.

Also avoid:

```text
Deep XPath
nth() without business validation
Generated CSS classes
DOM position-based selectors
```

For example, avoid:

```javascript
page.locator('div:nth-child(4) > table > tbody > tr:nth-child(1)')
```

Instead, identify the row using business data such as PO Number, PO Line, or Item.

---

# Important Automation Rules

1. Use **Playwright**, not Selenium.
2. Use Page Object Model.
3. Keep selectors inside Page Objects.
4. Use runtime-generated Receipt Number.
5. Never hard-code Oracle-generated transaction numbers.
6. Do not invent PO, Supplier, Item, Organization, or Location values.
7. Validate the PO before selecting the line.
8. Use exact business identifiers where possible.
9. Avoid `waitForTimeout()`.
10. Use `expect()` and state-based waits.
11. Handle Redwood/classic UI differences through configurable Page Objects where practical.
12. Handle lot/serial fields conditionally.
13. Handle different receipt-routing configurations conditionally.
14. Validate quantity against the receivable quantity.
15. Capture screenshots and traces on failure.
16. Verify the receipt after submission by searching for the generated Receipt Number.
17. Validate persisted business data, not only the success toast.
18. Keep positive and negative scenarios separate.
19. Use environment variables/configuration for environment-specific data.
20. Make test data controlled so repeated executions do not unintentionally create duplicate business transactions.

---

# Core End-to-End Automation Pattern

Implement the business flow as:

```text
Login
  ↓
Navigator
  ↓
Procurement
  ↓
Receiving
  ↓
Receive Expected Shipments
  ↓
Search PO
  ↓
Validate PO
  ↓
Select PO Line
  ↓
Enter Receipt Quantity
  ↓
Receiving Details
  ↓
Receipt Routing
  ↓
Lot/Serial (if applicable)
  ↓
Review
  ↓
Submit
  ↓
Capture Receipt Number
  ↓
Search Receipt
  ↓
Open Receipt
  ↓
Validate Persisted Receipt
  ↓
PASS / FAIL
```

Generate the Playwright implementation so that **functional business logic remains readable in the test file**, while Oracle-specific locators and UI interactions remain inside the Page Objects.
