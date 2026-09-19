# AI Prompt: Oracle Cloud SaaS AP Payment Creation Using Playwright

Act as a senior **Oracle Cloud SaaS Financials QA Automation Engineer** and **Playwright Test Architect**.

Create a robust, maintainable Playwright automation for **AP Payment Creation in Oracle Cloud SaaS**.

Use the **Manual Payment against an existing, validated AP Invoice** as the baseline scenario. Oracle Cloud UI labels can vary by release, Redwood/classic UI, configuration, and user role, so identify controls using business meaning rather than assuming exact DOM structure.

## Business Flow

**Supplier → AP Invoice → Invoice Validation → Payment → Payment Status**

## Test Preconditions / Data

Use an existing validated AP Invoice with:

* Business Unit: configured Procurement/Payables BU
* Supplier: existing supplier
* Supplier Site: existing site
* Invoice Number: existing validated invoice
* Invoice Amount: 5000 INR
* Remaining Amount: 5000 INR
* Payment Amount: 5000 INR
* Currency: INR
* Payment Date: valid payment date
* Payment Method: configured method such as Check/Electronic
* Disbursement Bank Account: configured and valid
* Invoice must be eligible for payment

Do not hard-code generated payment numbers. Capture the payment number dynamically at runtime.

---

# Implementation Steps — Maximum 22 Steps

### Step 1 — Login

Navigate to the Oracle Cloud login page.

* Enter username.
* Enter password.
* Click Sign In.
* Verify that Oracle Cloud Home is displayed.

### Step 2 — Open Navigator

Open the Oracle Cloud Navigator.

Verify that the application navigation menu is available before continuing.

### Step 3 — Navigate to Payables

Open the **Payables** work area.

Verify that the Payables landing/work area is displayed.

### Step 4 — Open Payments

Navigate to the **Payments** area.

Handle the configured Oracle navigation structure without relying on fixed DOM positions.

### Step 5 — Start Create Payment

Open the action/page used to create a new payment.

Verify that the payment creation page is displayed.

### Step 6 — Select Business Unit

Select the required Business Unit.

Verify that the selected Business Unit is correct before proceeding.

### Step 7 — Select Supplier and Supplier Site

Select:

* Supplier
* Supplier Site

Verify that both values correspond to the intended AP Invoice.

### Step 8 — Enter Payment Date

Enter the required Payment Date.

Validate that the date is acceptable for the configured accounting/payment rules.

### Step 9 — Select Payment Method

Select the configured Payment Method.

Examples may include:

* Check
* Electronic
* Other configured payment methods

Do not assume a payment method exists unless it is available in the environment.

### Step 10 — Select Disbursement Bank Account

Select the valid disbursement bank account.

Verify that the account is appropriate for the selected payment method and Business Unit.

### Step 11 — Verify Payment Currency

Verify or select the payment currency.

Expected value:

**INR**

Ensure that the currency is compatible with the invoice being paid.

### Step 12 — Search for the Invoice

Search for the existing AP Invoice using reliable business data.

Prefer:

* Invoice Number
* Supplier
* Business Unit
* Invoice Date

Do not blindly select the first invoice returned by the search.

### Step 13 — Validate Invoice Eligibility

Before selecting the invoice for payment, verify that it is eligible.

Validate, where available:

* Invoice is validated
* Invoice is not fully paid
* Remaining amount is greater than zero
* Supplier matches
* Currency matches
* Business Unit matches
* No blocking payment hold exists

### Step 14 — Select Invoice / Installment

Select the required invoice and applicable installment.

Capture the invoice/installment information for later assertions.

### Step 15 — Enter Payment Amount

Enter the payment amount.

For the baseline scenario:

**Payment Amount = 5000 INR**

Verify that the payment amount does not exceed the eligible remaining amount.

### Step 16 — Enter / Verify Payment Details

Review additional payment details required by the environment.

Verify relevant values such as:

* Supplier
* Supplier Site
* Payment Date
* Payment Method
* Bank Account
* Currency
* Invoice
* Installment
* Payment Amount

Handle conditional fields according to the environment configuration.

### Step 17 — Review Payment

Review the complete payment before submission.

Confirm that all business-critical values are correct.

Do not proceed if validation errors or blocking messages are displayed.

### Step 18 — Create / Submit Payment

Create or submit the payment using the appropriate Oracle Cloud action.

Wait for the application to complete the transaction using state-based synchronization.

### Step 19 — Capture Payment Number

Capture the generated **Payment Number** or equivalent payment identifier from the confirmation/result page.

Store it as a runtime variable:

`PAYMENT_NUMBER`

Never hard-code this value.

### Step 20 — Validate Payment Status

Verify the payment status displayed after creation.

Do not assume one universal final status because payment processing can be asynchronous and configuration-dependent.

Capture:

`PAYMENT_STATUS`

Validate the status against the expected state for the test scope.

### Step 21 — Search and Reopen Payment

Navigate to the payment search/manage area.

Search using the runtime `PAYMENT_NUMBER`.

Open the created payment and verify that it can be retrieved successfully.

### Step 22 — Final End-to-End Validation

Perform the final business-level assertions.

Verify the persisted payment contains the expected:

* Payment Number
* Supplier
* Supplier Site
* Business Unit
* Invoice Number
* Installment
* Payment Amount
* Currency
* Payment Date
* Payment Method
* Bank Account, where visible
* Payment Status

Mark the test **PASS** only when the payment is successfully created and the persisted transaction matches the expected business data.

---

# Recommended First Playwright Automation Scenario

## AP-PAY-001 — Full Payment Against a Validated AP Invoice

Use this as the first automation because it establishes the core AP payment lifecycle without adding unnecessary complexity.

### Test Data

```text
Business Unit    = Existing configured BU
Supplier         = Existing Supplier
Supplier Site    = Existing Supplier Site
Invoice Number   = Existing validated invoice
Invoice Amount   = 5000 INR
Remaining Amount = 5000 INR
Payment Amount   = 5000 INR
Currency         = INR
Payment Date     = Valid payment date
Payment Method   = Configured payment method
Bank Account     = Configured disbursement bank account
```

### Expected Business Result

A payment is created for the validated invoice for the full remaining amount.

The generated payment number is captured and used to search for the payment again.

---

# Recommended Automation Flow

```text
Login
  ↓
Open Navigator
  ↓
Payables
  ↓
Payments
  ↓
Create Payment
  ↓
Select Business Unit
  ↓
Select Supplier / Supplier Site
  ↓
Set Payment Date
  ↓
Select Payment Method
  ↓
Select Bank Account
  ↓
Verify Currency
  ↓
Search Invoice
  ↓
Validate Invoice Eligibility
  ↓
Select Invoice / Installment
  ↓
Enter Payment Amount
  ↓
Review Payment
  ↓
Create / Submit
  ↓
Capture Payment Number
  ↓
Validate Payment Status
  ↓
Search Payment
  ↓
Open Payment
  ↓
Verify Persisted Payment
```

---

# Primary Automation Assertions

The Playwright test should primarily validate business outcomes rather than only UI interactions.

### Payment Assertions

```text
Business Unit == expectedBusinessUnit
Supplier == expectedSupplier
Supplier Site == expectedSupplierSite
Invoice Number == expectedInvoiceNumber
Payment Amount == expectedPaymentAmount
Currency == INR
Payment Method == expectedPaymentMethod
Payment Date == expectedPaymentDate
Payment Number is not empty
Payment Number is searchable
Payment Status == expectedStatus/state
```

### Invoice-to-Payment Relationship

Verify that:

```text
Payment → Invoice Number
Payment → Installment
Payment → Supplier
Payment → Payment Amount
```

are correctly related.

### Persistence Assertion

After payment creation:

1. Leave the creation/confirmation page.
2. Search for the captured `PAYMENT_NUMBER`.
3. Reopen the payment.
4. Verify the persisted business values.

This is stronger than validating only a success message.

---

# Runtime Variables

Use runtime variables rather than hard-coded generated values.

```javascript
const runtimeData = {
  BUSINESS_UNIT: testData.businessUnit,
  SUPPLIER: testData.supplier,
  SUPPLIER_SITE: testData.supplierSite,
  INVOICE_NUMBER: testData.invoiceNumber,
  INSTALLMENT_NUMBER: null,
  PAYMENT_AMOUNT: testData.paymentAmount,
  PAYMENT_NUMBER: null,
  PAYMENT_STATUS: null
};
```

Capture:

```text
PAYMENT_NUMBER
PAYMENT_STATUS
INSTALLMENT_NUMBER
```

from the Oracle application wherever available.

---

# Important Playwright Considerations

## 1. Locator Strategy

Use locators in this order:

```text
1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. Stable CSS selector
7. XPath — last resort
```

Prefer business-readable locators.

Avoid relying on generated Oracle IDs such as:

```text
#pt1:_FOr1:1:...
```

Also avoid:

* Deep XPath
* Dynamic CSS classes
* DOM indexes
* `nth()` unless the business context makes it deterministic
* Selecting the first matching invoice without validating its identity

---

## 2. Do Not Use Fixed Waits

Do not use:

```javascript
await page.waitForTimeout(5000);
```

Use state-based synchronization:

```javascript
await expect(locator).toBeVisible();
await expect(locator).toBeEnabled();
await locator.waitFor();
```

Wait for meaningful application states such as search results, dialogs, buttons becoming enabled, confirmation content, or payment status changes.

---

## 3. Validate the Invoice Before Payment

The invoice is a critical prerequisite.

The automation should confirm that the selected invoice:

* Exists
* Belongs to the expected supplier
* Is validated
* Has an eligible remaining amount
* Has the expected currency
* Is not already fully paid
* Is not blocked by a payment hold

---

## 4. Identify Search Results by Business Data

If multiple invoices are returned, locate the specific row using the invoice number and validate the supplier/amount before selecting it.

Avoid:

```javascript
await page.locator('table tbody tr').first().click();
```

Prefer a business-contextual row locator.

---

## 5. Handle Asynchronous Payment Processing

Payment creation and subsequent payment processing may involve different application states.

Do not assume:

```text
Create Payment → immediately final/issued
```

Instead, distinguish the scope being automated:

```text
Payment Created
Payment Validated
Payment Issued
Payment Processed
Accounting Completed
Bank File Processed
```

Only assert the states that are required by the test scenario and supported by the configured environment.

---

## 6. Support Conditional UI

Payment screens can expose additional fields depending on:

* Payment Method
* Bank Account
* Business Unit
* Currency
* Supplier Site
* Payment Process Profile
* Security role
* Configuration

Build reusable helper methods that can safely handle optional/conditional controls.

---

## 7. Separate Full and Partial Payments

The first scenario should use a full payment:

```text
Remaining Invoice Amount = 5000
Payment Amount = 5000
```

Create separate scenarios for:

```text
Partial payment
Overpayment attempt
Zero payment
Negative payment
Already fully paid invoice
Invoice on payment hold
Invalid payment method
Invalid bank account
Currency mismatch
```

---

## 8. Use Page Object Model

Recommended classes:

```text
LoginPage
HomePage
NavigatorPage
PayablesPage
PaymentsPage
CreatePaymentPage
PaymentInvoiceSelectionPage
ManagePaymentsPage
```

Example responsibilities:

```text
CreatePaymentPage
  - selectBusinessUnit()
  - selectSupplier()
  - selectSupplierSite()
  - setPaymentDate()
  - selectPaymentMethod()
  - selectBankAccount()
  - searchInvoice()
  - selectInvoice()
  - setPaymentAmount()
  - reviewPayment()
  - submitPayment()
  - capturePaymentNumber()

ManagePaymentsPage
  - searchPayment()
  - openPayment()
  - verifySupplier()
  - verifyInvoice()
  - verifyAmount()
  - verifyPaymentMethod()
  - verifyPaymentStatus()
```

---

## 9. Keep Test Data Environment-Driven

Do not hard-code environment-specific values directly inside page objects.

Use:

```text
.env
environment.config.js
test-data/payment-data.js
```

for values such as:

```text
ORACLE_URL
USERNAME
BUSINESS_UNIT
SUPPLIER
SUPPLIER_SITE
INVOICE_NUMBER
PAYMENT_AMOUNT
CURRENCY
PAYMENT_METHOD
BANK_ACCOUNT
```

Secrets must not be committed to source control.

---

## 10. Add Diagnostics

For failures, capture:

* Screenshot
* Playwright trace
* Video where required
* Console errors
* Relevant application messages
* Current URL
* Payment number if generated
* Invoice number
* Test data used

This is especially important for Oracle Cloud UI automation because asynchronous loading and conditional components can make failures difficult to diagnose.

---

# Final Expected Automation Outcome

The completed Playwright test should demonstrate:

```text
Validated AP Invoice
        ↓
Eligible Invoice Selection
        ↓
Payment Creation
        ↓
Payment Number Captured
        ↓
Payment Status Validated
        ↓
Payment Searched Again
        ↓
Persisted Payment Details Verified
        ↓
PASS
```

The automation should validate the **business transaction lifecycle**, not merely that buttons were clicked or that a confirmation message appeared.
