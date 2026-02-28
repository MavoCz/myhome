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
    await expect(authenticatedPage.getByTestId('expenses-balances-row')).toBeVisible();
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

  test('navigates to Monthly Summary via button', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByRole('link', { name: /monthly summary/i }).click();
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
  test('expenses tile is visible on homepage', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByText('Expenses')).toBeVisible();
  });

  test('clicking expenses tile navigates to /expenses', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    // Click the module tile by name
    await authenticatedPage.getByText('Expenses').click();
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

  test('shows total spend card when expenses exist', async ({ authenticatedPage }) => {
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
// Manage Groups tab (inline in ExpensesPage)
// ===========================================================================

test.describe('Manage Groups tab', () => {
  test('ADMIN user sees "Manage Groups" tab on ExpensesPage', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await expect(authenticatedPage.getByTestId('expenses-page-tab-manage-groups')).toBeVisible();
  });

  test('clicking Manage Groups tab shows groups table', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await expect(authenticatedPage.getByTestId('expense-groups-table')).toBeVisible();
  });

  test('ADMIN user sees the default General group in Manage Groups tab', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    const table = authenticatedPage.getByTestId('expense-groups-table');
    await expect(table.locator('.MuiChip-label').filter({ hasText: /^Default$/ }).first()).toBeVisible();
  });

  test('ADMIN user can open Add Group dialog from Manage Groups tab', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    await expect(authenticatedPage.getByTestId('expense-group-dialog')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /create expense group/i })).toBeVisible();
  });

  test('Add Group dialog closes on Cancel', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    await authenticatedPage.getByRole('button', { name: /cancel/i }).click();
    await expect(authenticatedPage.getByTestId('expense-group-dialog')).not.toBeVisible();
  });

  test('creates a new expense group and it appears in the table', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();

    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: /name/i }).fill('E2E Test Group');

    await dialog.getByRole('button', { name: /create|save/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(authenticatedPage.getByText('E2E Test Group')).toBeVisible();
  });

  test('edit button opens Edit Group dialog pre-filled', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();

    // Create a group first
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await dialog.getByRole('textbox', { name: /name/i }).fill('EditableGroup');
    await dialog.getByRole('button', { name: /create|save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Click edit button for the new group
    const editBtns = authenticatedPage.locator('[data-testid^="expense-group-edit-btn-"]');
    // Find the one that corresponds to the new group row
    const newGroupRow = authenticatedPage.locator('[data-testid^="expense-group-row-"]').filter({ hasText: 'EditableGroup' });
    await expect(newGroupRow).toBeVisible();
    const editBtn = newGroupRow.locator('[data-testid^="expense-group-edit-btn-"]');
    await editBtn.click();

    const editDialog = authenticatedPage.getByTestId('expense-group-dialog');
    await expect(editDialog).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /edit expense group/i })).toBeVisible();
    // Pre-filled name
    await expect(editDialog.getByRole('textbox', { name: /name/i })).toHaveValue('EditableGroup');
  });

  test('Add Group dialog shows allowChildren switch for non-default groups', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    await expect(authenticatedPage.getByTestId('expense-group-allow-children-switch')).toBeVisible();
  });

  test('archive button archives a non-default group', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    await authenticatedPage.getByTestId('expense-groups-add-btn').click();
    const dialog = authenticatedPage.getByTestId('expense-group-dialog');
    await dialog.getByRole('textbox', { name: /name/i }).fill('Archive Target Group');
    await dialog.getByRole('button', { name: /create|save/i }).click();
    await expect(dialog).not.toBeVisible();

    const archiveBtns = authenticatedPage.locator('[data-testid^="expense-group-archive-btn-"]');
    await expect(archiveBtns.first()).toBeVisible();
    await archiveBtns.first().click();

    await expect(authenticatedPage.getByText('Archived')).toBeVisible();
  });

  test('default group has no archive button', async ({ authenticatedPage }) => {
    await goToExpenses(authenticatedPage);
    await authenticatedPage.getByTestId('expenses-page-tab-manage-groups').click();
    const defaultRow = authenticatedPage
      .locator('[data-testid^="expense-group-row-"]')
      .filter({ hasText: 'Default' });
    await expect(defaultRow).toBeVisible();
    const archiveBtnInDefault = defaultRow.locator('[data-testid^="expense-group-archive-btn-"]');
    await expect(archiveBtnInDefault).not.toBeVisible();
  });

  test('/expenses/groups URL redirects to /home (route removed)', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses/groups');
    // Should redirect to /home since route no longer exists
    await expect(authenticatedPage).toHaveURL(/\/home/);
  });
});
