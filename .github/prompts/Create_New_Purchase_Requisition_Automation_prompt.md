Act as an expert QA Automation Agent specializing in Oracle Fusion Cloud SaaS and Playwright.

Your task is to create and execute an automated test for creating a new Purchase Requisition in Oracle Cloud Procurement.

Follow exactly these 21 steps. Use the configured test data available in the environment. Do not invent item names, Business Units, locations, charge accounts, or other Oracle-specific values.

### Test Execution Steps

1. **Login to Oracle Cloud**

   * Open the Oracle Fusion Cloud URL.
   * Enter the provided username and password.
   * Click **Sign In**.
   * Verify that the Oracle Cloud home page is displayed.

2. **Open Navigator**

   * Click the **Navigator** menu.
   * Verify that the navigation menu is displayed.

3. **Navigate to Procurement**

   * Select **Procurement** from the Navigator.
   * Verify that the Procurement work area is displayed.

4. **Open Purchase Requisitions**

   * Select **Purchase Requisitions / Requisitions**.
   * Verify that the Purchase Requisitions page is displayed.

5. **Create New Requisition**

   * Click **Create Requisition**.
   * Verify that the Create Requisition page is displayed.

6. **Search for Catalog Item**

   * Locate the catalog search field.
   * Search for the configured test item.
   * Wait for search results to load.
   * Verify that the expected item is displayed.

7. **Select the Item**

   * Select the configured test item from the search results.
   * Verify that the item details are displayed.
   * Do not select a different item if multiple results are returned.

8. **Enter Quantity**

   * Enter the configured test quantity, for example `1`.
   * Verify that the quantity is accepted.
   * Do not proceed if a quantity validation error is displayed.

9. **Add Item to Cart**

   * Click **Add to Cart**.
   * Wait for the cart/addition confirmation.
   * Verify that the item has been added successfully.

10. **Open Shopping Cart**

    * Open **Cart / View Cart**.
    * Verify the selected item is present.
    * Verify that the quantity and item description are correct.

11. **Proceed to Checkout**

    * Click **Checkout**.
    * Wait for the checkout page to load.
    * Verify that the requisition checkout page is displayed.

12. **Enter Requisition Information**

    * Enter a unique requisition description using a timestamp, such as:
      `AUTO_TEST_REQ_<timestamp>`
    * Enter the configured justification if required.
    * Verify that the entered information is retained.

13. **Configure Requester**

    * Verify the Requester.
    * Use the logged-in test employee unless the test scenario explicitly requires another requester.
    * Verify that the requester is valid.

14. **Configure Delivery Information**

    * Select the configured **Deliver-to Location**.
    * Enter/select a valid future **Need-by Date**.
    * Verify that the delivery location and date are accepted.
    * Do not use an expired or invalid date.

15. **Configure Accounting Information**

    * Enter/select the configured Procurement Business Unit, Cost Center, Charge Account, Project, Task, or other required accounting information.
    * Use only valid values configured in the Oracle test environment.
    * Verify that Oracle accepts the accounting combination.

16. **Review Requisition Lines**

    * Verify the requisition line contains the expected:

      * Item
      * Quantity
      * Unit of Measure, if applicable
      * Need-by Date
      * Deliver-to Location
    * Verify that there are no unexpected additional lines.

17. **Review Complete Requisition**

    * Review the complete requisition before submission.
    * Verify:

      * Requester
      * Requisition Description
      * Item
      * Quantity
      * Delivery Location
      * Need-by Date
      * Accounting information
      * Total amount, where applicable
    * If validation errors exist, stop and report them.

18. **Submit Requisition**

    * Click **Submit / Submit Requisition**.
    * Wait for Oracle to complete the submission.
    * Do not use arbitrary fixed delays; wait for the relevant UI state or response.

19. **Capture Requisition Number**

    * Verify that the submission confirmation is displayed.
    * Locate and capture the generated **Requisition Number**.
    * Store it as a runtime variable:
      `REQUISITION_NUMBER`
    * Fail the test if no requisition number is generated.

20. **Search for Submitted Requisition**

    * Navigate to **My Requisitions / Manage Requisitions**.
    * Search using the captured `REQUISITION_NUMBER`.
    * Open the matching requisition.
    * Verify that the correct requisition is displayed.

21. **Perform Final Validation**

    * Verify all critical requisition details:

      * Requisition Number matches `REQUISITION_NUMBER`
      * Requester is correct
      * Item is correct
      * Quantity is correct
      * Delivery Location is correct
      * Need-by Date is correct
      * Accounting information is correct
      * Requisition status is appropriate for the configured approval workflow
    * If all validations pass, mark the test as **PASS**.
    * If any step fails, mark the test as **FAIL** and capture:

      * Failed step number
      * Screen/page name
      * Failed UI element
      * Error/validation message
      * Current URL
      * Screenshot
      * Relevant test data

### Playwright Automation Rules

* Use Playwright for browser automation.
* Prefer `getByRole()`, `getByLabel()`, `getByText()`, and stable `data-testid` selectors.
* Do not rely on Oracle-generated dynamic IDs or deeply nested XPath selectors.
* Wait for elements and page states instead of using unnecessary `waitForTimeout()`.
* Generate unique requisition descriptions using a timestamp.
* Generate the Need-by Date dynamically.
* Capture the generated Requisition Number as a runtime variable.
* Reuse the captured Requisition Number for final verification.
* Take screenshots automatically when a test step fails.
* Stop execution when a blocking error prevents continuation.
* Report the complete execution result as **PASS/FAIL**, including the failed step and evidence.
