Playwright Test Structure

I recommend turning the above into a Page Object Model rather than putting all 21 steps into one large test.

tests/
│
├── requisition/
│   └── create-requisition.spec.js
│
├── pages/
│   ├── LoginPage.js
│   ├── HomePage.js
│   ├── ProcurementPage.js
│   ├── RequisitionPage.js
│   ├── CatalogPage.js
│   ├── CartPage.js
│   ├── CheckoutPage.js
│   └── RequisitionDetailsPage.js
│
└── test-data/
    └── requisition-data.js
Example test structure
test('Create Purchase Requisition', async ({ page }) => {

    // 1. Login
    await loginPage.login(username, password);

    // 2-4. Navigate to Procurement
    await homePage.openNavigator();
    await homePage.openProcurement();
    await procurementPage.openPurchaseRequisitions();

    // 5. Create requisition
    await requisitionPage.createRequisition();

    // 6-9. Search catalog
    await requisitionPage.searchItem(testData.item);
    await requisitionPage.selectItem(testData.item);
    await requisitionPage.setQuantity(testData.quantity);
    await requisitionPage.addToCart();

    // 10-13. Cart and checkout
    await cartPage.open();
    await cartPage.checkout();

    // 14-16. Delivery/accounting
    await checkoutPage.setDescription(testData.description);
    await checkoutPage.setDeliveryLocation(testData.location);
    await checkoutPage.setNeedByDate(testData.needByDate);
    await checkoutPage.setChargeAccount(testData.chargeAccount);

    // 17-18. Review and submit
    await checkoutPage.review();
    const requisitionNumber = await checkoutPage.submit();

    // 19-21. Verify
    await requisitionPage.search(requisitionNumber);
    await requisitionPage.open(requisitionNumber);

    await requisitionPage.verifyDetails({
        item: testData.item,
        quantity: testData.quantity,
        location: testData.location
    });
});
Recommended Locator Strategy for Oracle Fusion

Oracle Fusion pages can contain dynamically generated DOM IDs, so for Playwright I would prioritize locators in this order:

1. Accessible role + name
page.getByRole('button', { name: 'Checkout' })
2. Label
page.getByLabel('Quantity')
3. Visible text
page.getByText('Purchase Requisitions')
4. Stable test attributes

If your implementation exposes a stable data-testid, use it.

Avoid
page.locator('#pt1:_FOr1:_FONSr2:0:_FOTRaT:0:...')

or deeply nested CSS/XPath generated from Oracle's page structure.

Those selectors are particularly vulnerable to Oracle UI/release changes.

Automation Scenario Matrix

I would create the following scenarios rather than only one positive test:

Test ID	Scenario	Expected
PR-001	Create catalog requisition	Successfully submitted
PR-002	Create requisition with quantity > 1	Correct quantity submitted
PR-003	Missing item	Validation displayed
PR-004	Invalid quantity	Validation displayed
PR-005	Invalid/missing delivery location	Validation displayed
PR-006	Invalid need-by date	Validation displayed
PR-007	Invalid charge account	Accounting validation displayed
PR-008	Multiple requisition lines	All lines submitted
PR-009	Non-catalog requisition	Non-catalog flow completes
PR-010	Submit requisition and verify	Requisition number and details match
AI-ready 21-step prompt

If you're planning to use an AI Playwright agent, you can also give it this condensed instruction:

Act as an Oracle Fusion Cloud Procurement QA automation agent.

Create a Purchase Requisition using the following 21-step workflow:

1. Login to Oracle Cloud.
2. Verify the Oracle Cloud home page.
3. Open Navigator.
4. Navigate to Procurement.
5. Open Purchase Requisitions.
6. Click Create Requisition.
7. Search the configured catalog item.
8. Select the expected item from search results.
9. Enter the required quantity.
10. Add the item to the shopping cart.
11. Open the cart and verify item and quantity.
12. Click Checkout.
13. Enter requisition description and justification.
14. Configure the requester and delivery location.
15. Enter a valid future Need-by Date.
16. Configure the required Procurement BU/accounting information.
17. Review the complete requisition and validate item, quantity, delivery and accounting information.
18. Submit the requisition.
19. Capture the generated Requisition Number from the confirmation page.
20. Navigate to My Requisitions and search using the captured Requisition Number.
21. Open the requisition and verify that the item, quantity, requester, delivery location and submission status are correct.

Automation rules:
- Use Playwright.
- Prefer getByRole(), getByLabel(), getByText() and stable test IDs.
- Do not rely on dynamically generated Oracle DOM IDs.
- Wait for UI state changes instead of using arbitrary sleep/timeouts.
- Generate unique requisition descriptions using a timestamp.
- Calculate Need-by Date dynamically.
- Capture the Requisition Number as a runtime variable.
- Take a screenshot on failure.
- Record the failed step, screen name, locator, error message and current URL.
- Stop execution if a blocking step fails.
- Do not assume catalog items, Business Units, locations or charge accounts; use the configured test data.
- Validate the final requisition using the captured requisition number.

This structure is particularly suitable for turning the flow into Playwright Page Objects + reusable AI actions, while keeping the business workflow independent of Oracle's changing DOM structure.