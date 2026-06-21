const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Column Header Inline Editing', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('double-clicking a column header allows inline renaming', async () => {
    // Target the "Assignee" column header
    const assigneeHeader = window.locator('th[data-col="assignee"]');
    await expect(assigneeHeader).toHaveText('Assignee');

    // Double-click to trigger edit mode
    await assigneeHeader.dblclick();

    // Verify an input field appeared inside the header
    const inputField = assigneeHeader.locator('input');
    await expect(inputField).toBeVisible();
    await expect(inputField).toHaveValue('Assignee');

    // Type a new name and press Enter
    await inputField.fill('Owner');
    await window.keyboard.press('Enter');

    // Verify the input field is gone and the header text updated
    await expect(inputField).toHaveCount(0);
    await expect(assigneeHeader).toHaveText('Owner');
  });
});
