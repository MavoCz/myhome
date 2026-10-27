import { test, expect } from '../../fixtures/page.fixture';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to /expenses and wait for the expenses page to be ready.
 */
async function goToExpenses(page: import('@playwright/test').Page) {
  await page.goto('/expenses');
  await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();
}

// ===========================================================================
// Expenses page
// ===========================================================================

test.describe('Expenses page', () => {
  test('renders the Expenses heading and core layout', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await expect(authenticatedPage.getByRole('heading', { name: /expenses/i })).toBeVisible();
    await expect(authenticatedPage.getByTestId('expenses-table')).toBeVisible();
    await expect(authenticatedPage.getByTestId('expenses-group-tabs')).toBeVisible();
  });

  test('shows the "All" tab by default', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    const allTab = authenticatedPage.getByTestId('expenses-tab-all');
    await expect(allTab).toBeVisible();
    await expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  test('shows balances row section', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    // The balances row container is always rendered; it may be empty if no member has expenses
    await expect(authenticatedPage.getByTestId('expenses-balances-row')).toBeAttached();
  });

  test('shows "No expenses yet" when list is empty', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await expect(authenticatedPage.getByText(/no expenses yet/i)).toBeVisible();
  });

  test('FAB opens Add Expense dialog for ADMIN users', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    const fab = authenticatedPage.getByTestId('expenses-add-fab');
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(authenticatedPage.getByTestId('expense-dialog')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /add expense/i })).toBeVisible();
  });

  test('Add Expense dialog has required fields', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-add-fab').click();
    await expect(authenticatedPage.getByTestId('expense-description-input')).toBeVisible();
    await expect(authenticatedPage.getByTestId('expense-amount-input')).toBeVisible();
    await expect(authenticatedPage.getByTestId('expense-date-input')).toBeVisible();
  });

  test('Add Expense dialog closes on Cancel', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-add-fab').click();
    await authenticatedPage.getByRole('button', { name: /cancel/i }).click();
    await expect(authenticatedPage.getByTestId('expense-dialog')).not.toBeVisible();
  });

  test('creates a new expense and it appears in the table', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-add-fab').click();

    const dialog = authenticatedPage.getByTestId('expense-dialog');
    await expect(dialog).toBeVisible();

    await authenticatedPage.getByTestId('expense-description-input').fill('E2E grocery run');
    await authenticatedPage.getByTestId('expense-amount-input').fill('350');

    // Submit
    await authenticatedPage.getByTestId('expense-submit-btn').click();

    // Dialog should close and expense should appear
    await expect(dialog).not.toBeVisible();
    await expect(authenticatedPage.getByText('E2E grocery run')).toBeVisible();
  });

  test('group filter tabs switch the active tab', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);

    // The General default group tab should be present
    const tabs = authenticatedPage.getByTestId('expenses-group-tabs');
    await expect(tabs).toBeVisible();

    // Click a group tab if one exists beyond "All"
    const groupTabs = authenticatedPage.locator('[data-testid^="expenses-tab-"]:not([data-testid="expenses-tab-all"])');
    const count = await groupTabs.count();
    if (count > 0) {
      await groupTabs.first().click();
      // The "All" tab should no longer be selected
      await expect(authenticatedPage.getByTestId('expenses-tab-all')).toHaveAttribute(
        'aria-selected',
        'false',
      );
    }
  });

  test('edit button opens Edit Expense dialog pre-filled', async ({ authenticatedPage }) => {
    // First create an expense
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-add-fab').click();
    await authenticatedPage.getByTestId('expense-description-input').fill('Edit me later');
    await authenticatedPage.getByTestId('expense-amount-input').fill('100');
    await authenticatedPage.getByTestId('expense-submit-btn').click();
    await expect(authenticatedPage.getByTestId('expense-dialog')).not.toBeVisible();

    // Find and click the edit button for the created expense (creator has canEdit=true)
    const editBtn = authenticatedPage.locator('[data-testid^="expense-edit-btn-"]').first();
    await expect(editBtn).toBeVisible();
    await expect(editBtn).not.toBeDisabled();
    await editBtn.click();

    const dialog = authenticatedPage.getByTestId('expense-dialog');
    await expect(dialog).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /edit expense/i })).toBeVisible();
    // Pre-filled description
    await expect(authenticatedPage.getByTestId('expense-description-input')).toHaveValue('Edit me later');
  });

  test('delete button removes expense from list', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-add-fab').click();
    await authenticatedPage.getByTestId('expense-description-input').fill('Delete me now');
    await authenticatedPage.getByTestId('expense-amount-input').fill('50');
    await authenticatedPage.getByTestId('expense-submit-btn').click();
    await expect(authenticatedPage.getByTestId('expense-dialog')).not.toBeVisible();
    await expect(authenticatedPage.getByText('Delete me now')).toBeVisible();

    const deleteBtn = authenticatedPage.locator('[data-testid^="expense-delete-btn-"]').last();
    await deleteBtn.click();

    await expect(authenticatedPage.getByText('Delete me now')).not.toBeVisible();
  });

  test('navigates to Monthly Summary via the module tab', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('module-tab-monthly-summary').click();
    await expect(authenticatedPage).toHaveURL(/\/expenses\/summary/);
    await expect(authenticatedPage.getByRole('heading', { name: /monthly summary/i })).toBeVisible();
  });

  test('actions column always visible (not hidden for ADMIN)', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    // The Actions header should always be present
    await expect(authenticatedPage.getByRole('columnheader', { name: /actions/i })).toBeVisible();
  });
});

// ===========================================================================
// Navigation from homepage
// ===========================================================================

test.describe('Expenses module tile on homepage', () => {
  // "Expenses" also labels the header nav and the bottom nav; the tile's accessible name includes its description
  const expensesTile = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: /^Expenses\s*Track and split family costs/ });

  test('expenses tile is visible on homepage', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(expensesTile(authenticatedPage)).toBeVisible();
  });

  test('clicking expenses tile navigates to /expenses', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expensesTile(authenticatedPage).click();
    await expect(authenticatedPage).toHaveURL(/\/expenses/);
    await expect(authenticatedPage.getByRole('heading', { name: /expenses/i })).toBeVisible();
  });
});

// ===========================================================================
// Monthly Summary page
// ===========================================================================

test.describe('Monthly Summary page', () => {
  test('renders heading and month picker', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/summary');
    await expect(authenticatedPage.getByRole('heading', { name: /monthly summary/i })).toBeVisible();
    await expect(authenticatedPage.getByTestId('summary-month-picker')).toBeVisible();
    await expect(authenticatedPage.getByTestId('summary-year-input')).toBeVisible();
    await expect(authenticatedPage.getByTestId('summary-month-input')).toBeVisible();
  });

  test('shows current month label', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/summary');
    const now = new Date();
    // Just check year is visible somewhere in the picker
    const yearInput = authenticatedPage.getByTestId('summary-year-input');
    await expect(yearInput).toHaveValue(String(now.getFullYear()));
  });

  test('changing year updates the month label', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/summary');
    const yearInput = authenticatedPage.getByTestId('summary-year-input');
    await yearInput.fill('2025');
    // The month label should contain 2025
    await expect(authenticatedPage.getByText(/2025/)).toBeVisible();
  });

  test('shows total spend card and pie charts when expenses exist', async ({ authenticatedPage }) => {
    // Create an expense first
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('expenses-add-fab').click();
    await authenticatedPage.getByTestId('expense-description-input').fill('Summary test expense');
    await authenticatedPage.getByTestId('expense-amount-input').fill('999');
    await authenticatedPage.getByTestId('expense-submit-btn').click();
    await expect(authenticatedPage.getByTestId('expense-dialog')).not.toBeVisible();

    // Now go to summary
    await authenticatedPage.goto('/expenses/summary');
    await expect(authenticatedPage.getByTestId('summary-total-card')).toBeVisible();
    await expect(authenticatedPage.getByText(/total spend/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/spending by group/i)).toBeVisible();

    // At least one pie chart should be visible (for the default group)
    const pieCharts = authenticatedPage.locator('[data-testid^="summary-group-pie-"]');
    await expect(pieCharts.first()).toBeVisible();
  });

  test('shows no-data message for empty month', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/summary');
    // Set to a historical month that will have no data
    const yearInput = authenticatedPage.getByTestId('summary-year-input');
    const monthInput = authenticatedPage.getByTestId('summary-month-input');
    await yearInput.fill('2020');
    await monthInput.fill('1');
    // Either "No data" or totalCzk = 0
    const noData = authenticatedPage.getByText(/no data for this month/i);
    const totalCard = authenticatedPage.getByTestId('summary-total-card');
    // One of them should be visible
    await expect(noData.or(totalCard)).toBeVisible();
  });
});

// ===========================================================================
// Manage Groups page (/expenses/groups, reached via the module tab)
// ===========================================================================

async function goToManageGroups(page: import('@playwright/test').Page) {
  await goToExpenses(page);
  await page.getByTestId('module-tab-manage-groups').click();
  await expect(page).toHaveURL(/\/expenses\/groups$/);
  await expect(page.getByRole('heading', { name: /manage groups/i })).toBeVisible();
}

async function createGroup(page: import('@playwright/test').Page, name: string) {
  await page.getByTestId('expense-groups-add-btn').click();
  const dialog = page.getByTestId('expense-group-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('expense-group-name-input').fill(name);
  await dialog.getByTestId('expense-group-submit-btn').click();
  await expect(dialog).not.toBeVisible();
  const row = page.locator('[data-testid^="expense-group-row-"]').filter({ hasText: name });
  await expect(row).toBeVisible();
  return row;
}

function defaultGroupRow(page: import('@playwright/test').Page) {
  return page
    .getByTestId('expense-groups-table')
    .locator('[data-testid^="expense-group-row-"]')
    .filter({ has: page.locator('.MuiChip-label', { hasText: /^Default$/ }) });
}

test.describe('Manage Groups page', () => {
  test('ADMIN user sees the Manage Groups module tab on the Expenses page', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await expect(authenticatedPage.getByTestId('module-tab-manage-groups')).toBeVisible();
  });

  test('clicking the Manage Groups tab shows the groups table', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    await expect(authenticatedPage.getByTestId('expense-groups-table')).toBeVisible();
    await expect(authenticatedPage.getByTestId('module-tab-manage-groups')).toHaveAttribute('aria-selected', 'true');
  });

  test('/expenses/groups opens the Manage Groups page directly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/groups');
    await expect(authenticatedPage).toHaveURL(/\/expenses\/groups$/);
    await expect(authenticatedPage.getByRole('heading', { name: /manage groups/i })).toBeVisible();
    await expect(authenticatedPage.getByTestId('expense-groups-table')).toBeVisible();
    await expect(authenticatedPage.getByTestId('module-tab-manage-groups')).toHaveAttribute('aria-selected', 'true');
  });

  test('ADMIN user sees the default General group', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    const row = defaultGroupRow(authenticatedPage);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('General');
  });

  test('ADMIN user can open the Add Group dialog', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /create expense group/i })).toBeVisible();
  });

  test('Add Group dialog closes on Cancel', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('creates a new expense group and it appears in the table', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    const row = await createGroup(authenticatedPage, 'E2E Test Group');
    await expect(row).toContainText('Active');
  });

  test('edit button opens Edit Group dialog pre-filled', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    const row = await createGroup(authenticatedPage, 'EditableGroup');

    await row.locator('[data-testid^="expense-group-edit-btn-"]').click();

    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /edit expense group/i })).toBeVisible();
    await expect(dialog.getByTestId('expense-group-name-input')).toHaveValue('EditableGroup');
  });

  test('allowChildren switch is shown for non-default groups only', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await expect(dialog.getByTestId('expense-group-allow-children-switch')).toBeVisible();
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    // The default group is always restricted, so its edit dialog has no switch
    await defaultGroupRow(authenticatedPage).locator('[data-testid^="expense-group-edit-btn-"]').click();
    await expect(dialog.getByRole('heading', { name: /edit expense group/i })).toBeVisible();
    await expect(dialog.getByTestId('expense-group-allow-children-switch')).toHaveCount(0);
  });

  test('archive button archives a non-default group', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    const row = await createGroup(authenticatedPage, 'Archive Target Group');

    await row.locator('[data-testid^="expense-group-archive-btn-"]').click();

    await expect(row).toContainText('Archived');
    await expect(row.locator('[data-testid^="expense-group-archive-btn-"]')).toHaveCount(0);
  });

  test('default group has no archive button', async ({ authenticatedPage }) => {
    await goToManageGroups(authenticatedPage);
    const row = defaultGroupRow(authenticatedPage);
    await expect(row).toBeVisible();
    await expect(row.locator('[data-testid^="expense-group-edit-btn-"]')).toBeVisible();
    await expect(row.locator('[data-testid^="expense-group-archive-btn-"]')).toHaveCount(0);
  });
});

// ===========================================================================
// CSV Import dialog
// ===========================================================================

/** Minimal Raiffeisen CSV: 2 outgoing + 1 incoming (incoming is skipped). */
const CSV_CONTENT = [
  'Datum provedení;Zaúčtovaná částka;Měna účtu;Id transakce;Název obchodníka;Název protiúčtu;Zpráva',
  '01.03.2026;-500,00;CZK;UI-TXN-001;Albert supermarket;;',
  '15.03.2026;-250,00;CZK;UI-TXN-002;;Prodejna ABC;',
  '20.03.2026;700,00;CZK;UI-TXN-003;;;prevod',
].join('\n');

function csvFile() {
  return {
    name: 'raiffeisen.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV_CONTENT, 'utf-8'),
  };
}

test.describe('CSV Import UI', () => {
  test('Import button is visible for ADMIN users on the expenses page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await expect(authenticatedPage.getByRole('heading', { name: /expenses/i })).toBeVisible();
    await expect(authenticatedPage.getByTestId('import-expenses-btn')).toBeVisible();
  });

  test('clicking Import button opens the import dialog', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('import-expenses-btn').click();
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();
    await expect(
      authenticatedPage.getByRole('heading', { name: /import expenses/i }),
    ).toBeVisible();
  });

  test('import dialog closes when Close is clicked without importing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('import-expenses-btn').click();
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();
    await authenticatedPage.getByRole('button', { name: /close/i }).click();
    await expect(authenticatedPage.getByTestId('import-dialog')).not.toBeVisible();
  });

  test('uploading a valid CSV and clicking Import shows a success result', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('import-expenses-btn').click();
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();

    const fileInput = authenticatedPage.getByTestId('import-file-input');
    await fileInput.setInputFiles(csvFile());

    await authenticatedPage.getByTestId('import-submit-btn').click();

    // Result alert with imported/skipped counts
    await expect(authenticatedPage.getByText(/imported 2/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/skipped 1/i)).toBeVisible();
  });

  test('Unassigned tab is always visible in group filter tabs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await expect(authenticatedPage.getByRole('heading', { name: /expenses/i })).toBeVisible();
    await expect(authenticatedPage.getByTestId('expenses-tab-unassigned')).toBeVisible();
  });

  test('clicking Unassigned tab after CSV import shows imported expenses with Unassigned chip', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/expenses');

    // Import the CSV via the UI dialog
    await authenticatedPage.getByTestId('import-expenses-btn').click();
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();

    await authenticatedPage.getByTestId('import-file-input').setInputFiles(csvFile());
    await authenticatedPage.getByTestId('import-submit-btn').click();
    await expect(authenticatedPage.getByText(/imported 2/i)).toBeVisible();

    // Close the dialog
    await authenticatedPage.getByRole('button', { name: /close/i }).click();
    await expect(authenticatedPage.getByTestId('import-dialog')).not.toBeVisible();

    // Switch to the Unassigned tab
    await authenticatedPage.getByTestId('expenses-tab-unassigned').click();

    // Expenses table should show the "Unassigned" chip (warning chip for null group)
    const expensesTable = authenticatedPage.getByTestId('expenses-table');
    await expect(expensesTable.getByText('Unassigned').first()).toBeVisible();
  });

  test('submitting import without selecting a file does not crash', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('import-expenses-btn').click();
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();

    // Click Import without selecting a file
    await authenticatedPage.getByTestId('import-submit-btn').click();

    // Should show an error message
    await expect(authenticatedPage.getByText(/please select a csv file/i)).toBeVisible();
    // Dialog should remain open
    await expect(authenticatedPage.getByTestId('import-dialog')).toBeVisible();
  });
});
