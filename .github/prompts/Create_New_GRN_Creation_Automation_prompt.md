# AI Prompt: Oracle Cloud SaaS GRN Creation — Playwright Automation

Act as a senior **Oracle Fusion Cloud SaaS Procurement/Receiving functional consultant and Playwright automation architect**.

Create a robust, reusable Playwright automation flow for **GRN (Goods Receipt Note) creation in Oracle Fusion Cloud SaaS**.

> In Oracle Fusion Cloud, GRN functionality may appear under terminology such as **Receiving, Receipts, Receive Expected Shipments, or Receiving Work Area** depending on the Oracle release, Redwood/classic UI, user role, and configuration. Treat the business transaction as an Oracle **Receipt/Receiving transaction**.

Use an existing **approved/open Purchase Order (PO)** as the source document. Do not invent Oracle master data. Use test data supplied by the environment.

## 22-Step Automation Flow

### Step 1 — Login

Navigate to the Oracle Cloud SaaS login page.

* Enter username.
* Enter password.
* Click **Sign In**.
* Wait for the Oracle Home page to become available.
* Validate successful login.

### Step 2 — Open Navigator

* Click the Oracle **Navigator**.
* Wait for the navigation panel/menu.
* Verify that Procurement-related navigation is available.

### Step 3 — Open Procurement

* Select **Procurement**.
* Wait for the Procurement work area to load.
* Validate that the Procurement page is displayed.

### Step 4 — Open Receiving

Navigate to the receiving function.

Depending on the environment, locate an appropriate option such as:

* Receiving
* Receipts
* Receive Expected Shipments
* Receiving Work Area
* My Receipts

Use accessible UI text rather than hard-coded Oracle-generated element IDs.

### Step 5 — Open Receive Expected Shipments

Open the page used to receive goods against an expected shipment/PO.

* Verify the receiving page.
* Wait until search/filter controls are ready.

### Step 6 — Search for the Purchase Order

Search using the runtime test-data value:

* `PO_NUMBER`

If available, additionally use:

* Supplier
* Supplier Site
* Procurement BU
* Item

Use exact business identifiers where possible.

### Step 7 — Validate PO Search Results

Verify that the expected PO is displayed.

Validate relevant information such as:

* PO Number
* Supplier
* Supplier Site
* PO Line
* Item
* Ordered Quantity
* Previously Received Quantity
* Remaining Quantity
* Ship-to Organization/Location

Fail the test if the expected PO cannot be uniquely identified.

### Step 8 — Select the PO Line

Select the required PO line for receiving.

Capture runtime values such as:

* `PO_LINE_NUMBER`
* `ITEM`
* `ORDERED_QUANTITY`
* `RECEIVED_QUANTITY`
* `REMAINING_QUANTITY`

### Step 9 — Enter Receipt Quantity

Enter the quantity to receive.

For the first automation scenario, use a **partial receipt** where configuration permits, for example:

* Ordered Quantity = 10
* Receipt Quantity = 5

Validate that the entered quantity does not exceed the receivable quantity unless the test specifically targets over-receipt behavior.

### Step 10 — Enter Receiving Details

Provide receiving information required by the environment.

Possible fields include:

* Receipt Quantity
* UOM
* Destination Type
* Organization
* Subinventory
* Locator
* Deliver-to Location

Only populate fields that are actually required by the configured receiving process.

### Step 11 — Select Receipt Routing

Handle the configured receiving routing.

Possible routing options include:

* Direct Delivery
* Standard Receipt
* Inspection Required

Verify the selected routing before continuing.

### Step 12 — Handle Lot/Serial Details

If the item is lot-controlled or serial-controlled:

* Open the appropriate Lot/Serial details section.
* Enter valid lot number(s) or serial number(s).
* Ensure quantities match the receipt quantity.
* Validate the entered details.

If the item is not controlled, skip this step safely.

### Step 13 — Enter Receiving Transaction Details

Populate applicable transaction information.

Examples:

* Receipt Date
* Packing Slip
* Shipment Number
* Carrier
* Comments
* Delivery details

Use dynamically generated values where uniqueness is required.

### Step 14 — Review Receipt

Before submission, validate the receipt information.

Confirm:

* PO Number
* PO Line
* Item
* Receipt Quantity
* UOM
* Receiving Organization
* Destination
* Lot/Serial information, if applicable
* Routing

Do not submit if mandatory validation errors are displayed.

### Step 15 — Submit Receipt

Click the appropriate action such as:

* Submit
* Receive
* Create Receipt

Wait for the transaction to complete using a state-based synchronization strategy.

### Step 16 — Capture Receipt Number

After successful submission:

* Capture the generated **Receipt Number** at runtime.
* Store it as:

`RECEIPT_NUMBER`

Do not hard-code the receipt number.

Also capture relevant transaction/status information if displayed.

### Step 17 — Validate Receipt Confirmation

Verify the Oracle confirmation/success state.

Validate that:

* Receipt creation completed successfully.
* Receipt number is displayed.
* No blocking error message exists.

Take a screenshot on failure.

### Step 18 — Navigate to Receipts

Navigate to the Oracle page used to search/manage receipts.

Possible labels include:

* Receipts
* Manage Receipts
* My Receipts
* Receiving Transactions

### Step 19 — Search for the Created Receipt

Search using the runtime:

`RECEIPT_NUMBER`

Do not reuse a hard-coded receipt number.

### Step 20 — Open Receipt Details

Open the created receipt and verify persisted transaction data.

Validate:

* Receipt Number
* PO Number
* Supplier
* PO Line
* Item
* Receipt Quantity
* Receipt Date
* Organization
* Destination
* Lot/Serial details where applicable

### Step 21 — Validate Business Transaction

Perform final business-level validation.

Confirm that:

* The receipt quantity is persisted correctly.
* The receipt references the expected PO.
* The correct PO line was received.
* Item information is correct.
* Destination information is correct.
* Lot/serial information is correct when applicable.
* The transaction status is appropriate for the configured workflow.

### Step 22 — Final Automation Result

Return a clear automation result.

**PASS** only when:

1. Login succeeded.
2. Expected PO was found.
3. Correct PO line was selected.
4. Receipt was successfully created.
5. Receipt number was captured.
6. Receipt can be searched after creation.
7. Persisted receipt data matches expected test data.

Otherwise return **FAIL** with:

* Failed step
* Error/validation message
* Expected result
* Actual result
* Screenshot/log reference where available

---

# Recommended First Automation Test Scenario

## GRN-001 — Partial Receipt Against an Existing PO

**Objective:** Verify that a user can create a receipt for part of the ordered quantity against an eligible PO and subsequently verify the persisted receipt.

### Test Data

| Field                  | Example                       |
| ---------------------- | ----------------------------- |
| PO Number              | Existing approved/open PO     |
| PO Line                | 1                             |
| Ordered Quantity       | 10                            |
| Receipt Quantity       | 5                             |
| Item                   | Existing configured item      |
| UOM                    | Each                          |
| Supplier               | Existing PO supplier          |
| Receiving Organization | Valid configured organization |
| Destination            | Valid configured destination  |

### Expected Flow

1. Login to Oracle Cloud.
2. Navigate to Procurement → Receiving.
3. Open **Receive Expected Shipments**.
4. Search for the existing PO.
5. Select the correct PO line.
6. Enter receipt quantity = **5**.
7. Enter required receiving/destination information.
8. Submit the receipt.
9. Capture the generated `RECEIPT_NUMBER`.
10. Navigate to the receipt search/manage page.
11. Search using the captured receipt number.
12. Open the receipt.
13. Verify PO number, PO line, item, and receipt quantity.
14. Confirm receipt quantity = **5**.

### Primary Assertions

```text
PO Number = expected PO
PO Line = expected PO line
Item = expected item
Ordered Quantity = 10
Receipt Quantity = 5
Receipt Number = generated and non-empty
Receipt exists after submission = true
Persisted Receipt Quantity = 5
```

This scenario establishes the basic **PO → Receiving → Receipt → Search → Verification** automation pattern before adding lot, serial, inspection, or negative scenarios.

---

# Important Playwright Automation Considerations

## 1. Prefer Business-Meaningful Locators

Use this priority:

```text
1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. Stable CSS selector
7. XPath only as a last resort
```

Examples:

```javascript
page.getByRole('button', { name: 'Submit' })

page.getByLabel('Receipt Quantity')

page.getByPlaceholder('Search')

page.getByText('Receive Expected Shipments', { exact: true })
```

Avoid selectors based on generated Oracle IDs such as:

```text
#pt1:_FOr1:1:...
```

and deeply nested XPath expressions.

## 2. Do Not Hard-Code Transaction Numbers

PO and Receipt numbers may be environment-specific.

Capture them dynamically:

```javascript
const poNumber = testData.poNumber;
const receiptNumber = await receivingPage.captureReceiptNumber();
```

Use the generated receipt number for subsequent verification.

## 3. Use State-Based Synchronization

Avoid:

```javascript
await page.waitForTimeout(5000);
```

Prefer:

```javascript
await expect(page.getByText('Receive Expected Shipments')).toBeVisible();

await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

Wait for actual UI/business state changes rather than arbitrary time.

## 4. Validate the PO Before Receiving

Do not blindly select the first search result.

Verify:

```text
PO Number
Supplier
Supplier Site
PO Line
Item
Remaining Quantity
Ship-to Organization
```

This prevents accidentally receiving against the wrong PO.

## 5. Handle Conditional UI

Receiving screens can change based on item/configuration.

Examples:

```text
Lot-controlled item       → Lot entry required
Serial-controlled item    → Serial entry required
Inspection routing        → Inspection-related fields/actions
Direct Delivery           → Different destination flow
Standard Receipt          → Additional receiving transaction
```

Design the Page Objects so these are handled conditionally rather than assuming every receipt has identical fields.

## 6. Validate Quantity Rules

The automation should verify:

```text
Receipt Quantity > 0
Receipt Quantity <= receivable quantity
```

unless the specific test is designed to verify Oracle's over-receipt tolerance/configuration.

Also test:

```text
0 quantity
Negative quantity
Over-receipt
Decimal quantity where applicable
Multiple partial receipts
```

## 7. Capture Runtime Transaction Data

Maintain runtime variables such as:

```javascript
let PO_NUMBER;
let PO_LINE_NUMBER;
let ITEM;
let RECEIPT_QUANTITY;
let RECEIPT_NUMBER;
```

These values should flow through the entire test.

## 8. Verify Persistence, Not Just the Success Message

A success toast alone should not be considered sufficient.

The test should:

```text
Create Receipt
      ↓
Capture Receipt Number
      ↓
Navigate to Receipt Search
      ↓
Search Receipt Number
      ↓
Open Receipt
      ↓
Validate persisted data
```

This provides stronger end-to-end coverage.

## 9. Keep Functional and Negative Tests Separate

Recommended files:

```text
create-grn.spec.js
create-grn-negative.spec.js
receiving-validation.spec.js
```

This makes failures easier to diagnose and keeps the happy-path test focused.

## 10. Use Environment-Driven Test Data

Keep environment-specific values outside the test logic.

Example:

```javascript
const grnData = {
    poNumber: process.env.PO_NUMBER,
    receiptQuantity: 5,
    receivingOrganization: process.env.RECEIVING_ORG,
    destinationLocation: process.env.DESTINATION_LOCATION
};
```

Do not embed production-specific Oracle IDs or configuration values directly in selectors.

## 11. Add Failure Diagnostics

Configure Playwright to collect:

```text
Screenshot
Trace
Video where appropriate
Console errors
Test logs
```

Especially capture the page state when:

* PO search fails
* Submit fails
* Receipt number is missing
* Receipt cannot be found after creation
* Quantity validation fails

## 12. Make the Test Idempotent Where Possible

Because receipts create real business transactions, avoid repeatedly receiving the same quantity against the same PO during every test run.

Prefer:

* Dedicated test PO
* Controlled test data
* Unique PO per test where feasible
* Runtime receipt tracking
* Cleanup/reconciliation strategy where supported

Do not automatically reverse/delete a receipt unless the Oracle environment and test requirements explicitly support that operation.

## 13. Keep Page Objects Business-Focused

Example responsibilities:

```text
ReceivingPage
    openReceiving()
    openReceiveExpectedShipments()
    searchPurchaseOrder()
    selectPOLine()
    enterReceiptQuantity()
    enterReceivingDetails()
    selectReceiptRouting()
    submitReceipt()
    captureReceiptNumber()

ManageReceiptsPage
    searchReceipt()
    openReceipt()
    verifyReceiptDetails()
```

Tests should describe the business flow rather than contain large numbers of raw selectors.

## 14. Final Assertion Pattern

The final test should effectively validate:

```text
Expected PO
      =
Receipt PO

Expected PO Line
      =
Receipt PO Line

Expected Item
      =
Receipt Item

Expected Receipt Quantity
      =
Persisted Receipt Quantity

Generated Receipt Number
      =
Existing Receipt Number
```

Use this as the baseline for expanding the automation suite into full GRN/Receiving coverage.
