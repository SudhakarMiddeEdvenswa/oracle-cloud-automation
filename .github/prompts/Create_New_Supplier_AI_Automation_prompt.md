# AI Automation Prompt – Create New Supplier in Oracle Cloud SaaS

Act as an expert QA automation agent for Oracle Cloud SaaS. Execute the following end-to-end UI test to create a new Supplier. Follow the steps in sequence, identify the correct UI elements using their visible labels/text, and do not skip validation checkpoints.

### Test Data

Use unique test data for every execution:

* Supplier Name: `AUTO_TEST_SUPPLIER_<timestamp>`
* Tax Country: `India`
* Tax Registration Number: `29ABCDE1234F1Z5`
* Supplier Type: `Services`
* Address Name: `Head Office`
* Address Line 1: `Plot 100, Test Industrial Area`
* City: `Bengaluru`
* State: `Karnataka`
* Postal Code: `560001`
* Address Purpose: `Purchasing`, `Remit To`
* Site Name: `Head Office`
* Receipt Routing: `Direct`
* Contact First Name: `Automation`
* Contact Last Name: `User`
* Contact Email: `automation@example.com`

## Execution Steps

### 1. Login to Oracle Cloud

Open the Oracle Cloud SaaS application URL and log in using the provided test credentials.

**Expected:** Oracle Cloud home page is displayed successfully.

### 2. Open Navigator

Click the **Navigator** menu/icon from the Oracle Cloud home page.

**Expected:** Navigator menu is displayed.

### 3. Navigate to Procurement

From Navigator, select **Procurement**.

**Expected:** Procurement-related navigation options are displayed.

### 4. Open Suppliers

Navigate to **Suppliers / Manage Suppliers**.

**Expected:** Supplier Management/Suppliers page is displayed.

### 5. Start Supplier Creation

Click **Create Supplier**.

**Expected:** Create Supplier page/form is displayed.

### 6. Enter Supplier Information

Enter the following:

* Supplier Name = `AUTO_TEST_SUPPLIER_<timestamp>`
* Tax Country = `India`
* Tax Registration Number = `29ABCDE1234F1Z5`

Click **Create**.

**Expected:** Supplier is successfully created and the Supplier Profile page opens.

### 7. Capture Supplier Number

Locate the automatically generated **Supplier Number** and store it as a runtime variable:

`SUPPLIER_NUMBER`

**Expected:** Supplier Number is present and captured successfully.

### 8. Validate Supplier Profile

Open the **Profile/Organization Details** section.

Enter or verify:

* Supplier Type = `Services`

Save the changes if required.

**Expected:** Supplier profile information is saved successfully.

### 9. Navigate to Addresses

Open the **Addresses** section/tab and select **Create / Add**.

**Expected:** Create Address page/form is displayed.

### 10. Create Supplier Address

Enter:

* Address Name = `Head Office`
* Country = `India`
* Address Line 1 = `Plot 100, Test Industrial Area`
* City = `Bengaluru`
* State = `Karnataka`
* Postal Code = `560001`

**Expected:** Address information is accepted without validation errors.

### 11. Configure Address Purpose

Set the appropriate address purposes:

* Purchasing = Yes
* Remit To = Yes

Save the address.

**Expected:** `Head Office` address is displayed in the supplier's address list with the selected purposes.

### 12. Navigate to Supplier Sites

Open the **Sites** section/tab and click **Create / Add**.

**Expected:** Supplier Site creation page/form is displayed.

### 13. Create Supplier Site

Enter/select:

* Site Name = `Head Office`
* Address = `Head Office`

If a Business Unit is required, select the configured test Procurement Business Unit.

**Expected:** Supplier site information is accepted.

### 14. Configure Receiving

Navigate to the **Receiving** section/subtab.

Set:

* Receipt Routing = `Direct`

Save the changes if required.

**Expected:** Receipt Routing is successfully configured.

### 15. Configure Site Assignment

Navigate to **Site Assignments**.

Use **Autocreate Assignments** if available, or manually configure the required Procurement Business Unit assignment.

**Expected:** Supplier Site is associated with the required Procurement Business Unit.

### 16. Save Supplier Site

Save and close the Supplier Site configuration.

**Expected:** Supplier Site appears under the supplier's Sites list.

Verify:

* Site Name = `Head Office`
* Address = `Head Office`
* Procurement BU = expected configured BU

### 17. Navigate to Contacts

Open the **Contacts** section/tab and click **Create / Add**.

**Expected:** Create Contact form is displayed.

### 18. Create Supplier Contact

Enter:

* First Name = `Automation`
* Last Name = `User`
* Email = `automation@example.com`

If required, mark **Administrative Contact**.

Associate the contact with the `Head Office` address if the option is available.

Save the contact.

**Expected:** Contact is successfully created and displayed in the Contacts list.

### 19. Save the Complete Supplier

Return to the main Supplier Profile and save all pending changes.

**Expected:** No validation errors are displayed and the supplier information is successfully saved.

### 20. Search and Reopen Supplier

Navigate back to **Procurement → Suppliers / Manage Suppliers**.

Search using the captured:

`SUPPLIER_NUMBER`

If Supplier Number search is unavailable, search using:

`AUTO_TEST_SUPPLIER_<timestamp>`

Open the supplier record.

**Expected:** The newly created supplier is returned in the search results and opens successfully.

### 21. Perform Final End-to-End Validation

Validate the following information on the Supplier Profile:

* Supplier Name matches the generated test supplier name.
* Supplier Number matches `SUPPLIER_NUMBER`.
* Supplier Type = `Services`.
* Address `Head Office` exists.
* Country = `India`.
* City = `Bengaluru`.
* State = `Karnataka`.
* Postal Code = `560001`.
* Purchasing address purpose is configured.
* Remit To address purpose is configured.
* Supplier Site `Head Office` exists.
* Supplier Site is associated with the expected Procurement Business Unit.
* Receipt Routing = `Direct`.
* Supplier Contact = `Automation User`.
* Contact Email = `automation@example.com`.

If all validations pass, mark the test as **PASS**.

If any step fails, capture:

1. The failed step number.
2. Screen/page name.
3. UI element that caused the failure.
4. Error/validation message.
5. Screenshot/evidence.
6. Current URL.
7. Relevant test data.

Do not continue blindly after a blocking failure. Attempt recovery only when the recovery action is unambiguous; otherwise stop execution and report the failure.
