# AI Prompt — Oracle Fusion Cloud Purchase Order Automation

Act as an expert **Oracle Fusion Cloud Procurement QA Automation Agent** and **Playwright Test Automation Architect**.

Your task is to create and execute an automated end-to-end test for creating a **Purchase Order (PO)** in Oracle Cloud SaaS.

Use only the configured test data available in the environment. Do not invent Supplier, Supplier Site, Procurement BU, Buyer, Item, Location, Organization, or accounting values.

## Test Data

Use the following logical test-data variables:

```text
SUPPLIER
SUPPLIER_SITE
PROCUREMENT_BU
BUYER
CURRENCY
ITEM
QUANTITY
UNIT_OF_MEASURE
UNIT_PRICE
NEED_BY_DATE
SHIP_TO_ORGANIZATION
SHIP_TO_LOCATION
CHARGE_ACCOUNT
PO_DESCRIPTION
```

Generate:

```text
PO_DESCRIPTION = AUTO_TEST_PO_<timestamp>
```

Capture the generated Purchase Order Number as:

```text
PO_NUMBER
```

---

# 23-Step Purchase Order Automation

### 1. Login to Oracle Cloud

Open the Oracle Fusion Cloud URL, enter the provided username and password, click **Sign In**, and verify that the Oracle Cloud Home page is displayed.

### 2. Open Navigator

Click the **Navigator** menu and verify that the navigation menu is displayed.

### 3. Navigate to Procurement

Select **Procurement** from the Navigator and verify that the Procurement work area is available.

### 4. Open Purchase Orders

Navigate to **Purchase Orders / Manage Orders** and verify that the Purchase Orders page is displayed.

### 5. Start Purchase Order Creation

Click **Create Order / Create Purchase Order** and verify that the PO creation page is displayed.

### 6. Select Procurement Business Unit

Select `PROCUREMENT_BU` and verify that the correct Procurement Business Unit is populated.

### 7. Select Supplier

Search for and select `SUPPLIER`. Verify that the selected Supplier is displayed in the PO header.

### 8. Select Supplier Site

Select `SUPPLIER_SITE` and verify that the Supplier Site belongs to the selected Supplier.

### 9. Configure PO Header

Select or verify the configured `BUYER` and `CURRENCY`. Populate any other mandatory PO header fields required by the environment.

### 10. Enter PO Description

Enter:

```text
AUTO_TEST_PO_<timestamp>
```

Verify that the description is accepted and retained.

### 11. Add PO Line

Navigate to the PO Lines section and click **Add Row / Add Line**. Select the appropriate configured line type.

### 12. Select Item

Search for and select `ITEM`. If multiple results are returned, select the exact configured item using a stable business identifier such as Item Number or exact description.

### 13. Enter Quantity and Price

Enter:

```text
QUANTITY
UNIT_OF_MEASURE
UNIT_PRICE
```

Verify that Oracle accepts the values and calculates the line amount correctly.

### 14. Open Schedule Details

Open the PO line **Schedule** details and configure the required schedule information.

### 15. Configure Need-by Date

Set `NEED_BY_DATE` to a valid future date. Verify that the date is accepted and is not in the past.

### 16. Configure Ship-to Information

Select:

```text
SHIP_TO_ORGANIZATION
SHIP_TO_LOCATION
```

Verify that the correct organization and location are displayed on the PO schedule.

### 17. Configure Distribution

Open **Distribution** details and enter/select the configured `CHARGE_ACCOUNT` and any other required accounting information.

### 18. Validate PO Line and Distribution

Verify:

```text
Item = ITEM
Quantity = QUANTITY
UOM = UNIT_OF_MEASURE
Price = UNIT_PRICE
Need-by Date = NEED_BY_DATE
Ship-to Organization = SHIP_TO_ORGANIZATION
Ship-to Location = SHIP_TO_LOCATION
Charge Account = CHARGE_ACCOUNT
```

Stop execution if Oracle displays a blocking validation error.

### 19. Review Complete Purchase Order

Review the entire PO and verify:

```text
Supplier
Supplier Site
Procurement BU
Buyer
Currency
PO Description
Item
Quantity
Price
Need-by Date
Ship-to Location
Accounting
```

Verify that no unexpected PO lines exist.

### 20. Submit Purchase Order

Click **Submit / Submit Purchase Order**. Wait for the appropriate Oracle UI state instead of using arbitrary fixed delays.

### 21. Capture PO Number

After successful submission, locate the generated **Purchase Order Number** and store it as:

```text
PO_NUMBER
```

Fail the test if the PO number cannot be identified.

### 22. Search and Open PO

Navigate to **Purchase Orders / Manage Orders**, search using `PO_NUMBER`, open the matching PO and verify that the correct Purchase Order is displayed.

### 23. Final End-to-End Validation

Verify the following:

```text
PO Number = PO_NUMBER
Supplier = SUPPLIER
Supplier Site = SUPPLIER_SITE
Procurement BU = PROCUREMENT_BU
Buyer = BUYER
Item = ITEM
Quantity = QUANTITY
UOM = UNIT_OF_MEASURE
Price = UNIT_PRICE
Need-by Date = NEED_BY_DATE
Ship-to Organization = SHIP_TO_ORGANIZATION
Ship-to Location = SHIP_TO_LOCATION
Charge Account = CHARGE_ACCOUNT
```

Verify that the PO status is appropriate for the configured approval workflow.

If all validations pass, mark the test **PASS**.

If any step fails, mark the test **FAIL** and capture:

* Step number
* Screen name
* Failed UI element
* Error message
* Current URL
* Screenshot
* Relevant test data
* Playwright error/stack trace

---

# Playwright Automation Rules

1. Use Playwright with the Page Object Model.
2. Prefer:

   * `getByRole()`
   * `getByLabel()`
   * `getByText()`
   * `getByPlaceholder()`
   * stable `data-testid` attributes.
3. Do not depend on Oracle-generated dynamic IDs.
4. Avoid deeply nested CSS selectors and absolute XPath.
5. Use explicit Playwright waits based on UI state.
6. Avoid unnecessary `waitForTimeout()`.
7. Generate PO descriptions dynamically.
8. Calculate future dates dynamically.
9. Store `PO_NUMBER` as a runtime variable.
10. Reuse `PO_NUMBER` for final verification.
11. Take screenshots automatically when a test fails.
12. Capture browser console errors where useful.
13. Do not assume the PO will always become `Approved`; validate the status appropriate to the configured approval workflow.
14. Do not invent Oracle master data.
15. If a search returns multiple records, identify the exact configured record.
16. Stop on blocking errors rather than continuing with invalid state.
17. Produce a final execution report containing:

* Test name
* PASS/FAIL
* PO Number
* Failed step, if any
* Error message
* Screenshot location
* Validation results

---

# Playwright Test Architecture

Use the following project structure:

```text
oracle-playwright/
│
├── tests/
│   └── purchase-order/
│       ├── create-purchase-order.spec.js
│       ├── create-purchase-order-negative.spec.js
│       └── purchase-order-validation.spec.js
│
├── pages/
│   ├── LoginPage.js
│   ├── HomePage.js
│   ├── NavigatorPage.js
│   ├── ProcurementPage.js
│   ├── PurchaseOrderPage.js
│   ├── POLinePage.js
│   ├── POSchedulePage.js
│   ├── PODistributionPage.js
│   └── ManageOrdersPage.js
│
├── fixtures/
│   └── test-fixtures.js
│
├── test-data/
│   ├── purchase-order-data.js
│   └── environment-data.js
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
│
└── reports/
```

---

# Page Object Responsibilities

## LoginPage.js

Responsible for:

```text
login()
enterUsername()
enterPassword()
clickSignIn()
verifyHomePage()
```

## HomePage.js

Responsible for:

```text
openNavigator()
verifyHomePage()
```

## NavigatorPage.js

Responsible for:

```text
openProcurement()
```

## ProcurementPage.js

Responsible for:

```text
openPurchaseOrders()
openManageOrders()
```

## PurchaseOrderPage.js

Responsible for:

```text
createPurchaseOrder()
selectProcurementBU()
selectSupplier()
selectSupplierSite()
selectBuyer()
setCurrency()
setDescription()
addLine()
reviewPO()
submitPO()
capturePONumber()
```

## POLinePage.js

Responsible for:

```text
selectLineType()
selectItem()
setQuantity()
setUOM()
setPrice()
verifyLine()
```

## POSchedulePage.js

Responsible for:

```text
openSchedule()
setNeedByDate()
setShipToOrganization()
setShipToLocation()
verifySchedule()
```

## PODistributionPage.js

Responsible for:

```text
openDistribution()
setChargeAccount()
setCostCenter()
setProject()
verifyDistribution()
```

## ManageOrdersPage.js

Responsible for:

```text
searchPO()
openPO()
verifyPONumber()
verifySupplier()
verifySupplierSite()
verifyPOLine()
verifySchedule()
verifyDistribution()
verifyPOStatus()
```

---

# Example Playwright Test

Create the main test approximately as follows:

```javascript
import { test, expect } from '@playwright/test';

test('Create Purchase Order - E2E', async ({
    page,
    loginPage,
    homePage,
    procurementPage,
    purchaseOrderPage,
    poLinePage,
    poSchedulePage,
    poDistributionPage,
    manageOrdersPage
}) => {

    // 1-2 Login and Home
    await loginPage.login();
    await homePage.openNavigator();

    // 3-4 Procurement / Purchase Orders
    await homePage.openProcurement();
    await procurementPage.openPurchaseOrders();

    // 5-10 PO Header
    await purchaseOrderPage.createPurchaseOrder();
    await purchaseOrderPage.selectProcurementBU();
    await purchaseOrderPage.selectSupplier();
    await purchaseOrderPage.selectSupplierSite();
    await purchaseOrderPage.selectBuyer();
    await purchaseOrderPage.setDescription();

    // 11-13 PO Line
    await purchaseOrderPage.addLine();
    await poLinePage.selectLineType();
    await poLinePage.selectItem();
    await poLinePage.setQuantity();
    await poLinePage.setPrice();

    // 14-16 Schedule
    await poSchedulePage.openSchedule();
    await poSchedulePage.setNeedByDate();
    await poSchedulePage.setShipToOrganization();
    await poSchedulePage.setShipToLocation();

    // 17-18 Distribution
    await poDistributionPage.openDistribution();
    await poDistributionPage.setChargeAccount();

    // 19 Review
    await purchaseOrderPage.reviewPO();

    // 20-21 Submit / Capture PO
    const poNumber = await purchaseOrderPage.submitPO();

    expect(poNumber).toBeTruthy();

    // 22 Search
    await manageOrdersPage.searchPO(poNumber);
    await manageOrdersPage.openPO(poNumber);

    // 23 Final validation
    await manageOrdersPage.verifyPO({
        poNumber,
        supplier: testData.supplier,
        supplierSite: testData.supplierSite,
        item: testData.item,
        quantity: testData.quantity,
        price: testData.price
    });
});
```

---

# Recommended Locator Pattern

For Oracle Fusion, instruct the AI agent to use this priority:

```text
1. data-testid
       ↓
2. getByRole()
       ↓
3. getByLabel()
       ↓
4. getByText()
       ↓
5. getByPlaceholder()
       ↓
6. CSS locator using stable attributes
       ↓
7. XPath only as a last resort
```

For example:

```javascript
await page.getByRole('button', {
    name: /create order/i
}).click();

await page.getByLabel('Supplier').fill(testData.supplier);

await page.getByRole('button', {
    name: /submit/i
}).click();
```

Avoid Oracle-generated selectors such as:

```javascript
page.locator(
  '#pt1\\:r1\\:0\\:supplierInput'
)
```

because these can change across Oracle releases, environments, or UI configurations.

---

# Recommended Negative Scenarios

After the positive `PO-001` scenario is stable, create separate automated scenarios for:

```text
PO-002  Missing Supplier
PO-003  Invalid Supplier Site
PO-004  Missing Item
PO-005  Quantity = 0
PO-006  Negative Quantity
PO-007  Missing Price
PO-008  Invalid Need-by Date
PO-009  Invalid Ship-to Location
PO-010  Invalid Charge Account
PO-011  Multiple PO Lines
PO-012  Multiple Distributions
PO-013  PO Submission / Approval Validation
PO-014  Search and Verify Existing PO
```

Keep these as separate tests rather than adding large numbers of conditional branches to the main happy-path test. This makes the Playwright suite easier to maintain and gives you much clearer failure reporting.
