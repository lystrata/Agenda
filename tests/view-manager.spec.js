const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('F8 View Manager Modal', () => {
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

  test('F8 opens the View Manager modal', async () => {
    await window.locator('#grid-container').focus();

    // Default title is Main View
    await expect(window.locator('#view-title')).toHaveText('Main View');

    // Press F8
    await window.keyboard.press('F8');

    // Modal should be visible
    const modal = window.locator('#view-manager-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // List should be populated
    const listItems = window.locator('#view-list li');
    await expect(listItems).toHaveCount(4);
    await expect(listItems.nth(0)).toHaveText('Main View');
    
    // First item should be selected
    await expect(listItems.nth(0)).toHaveClass(/selected/);
  });

  test('Keyboard navigation selects different views', async () => {
    await window.locator('#grid-container').focus();
    await window.keyboard.press('F8');

    const listItems = window.locator('#view-list li');
    
    // Move down 2 times
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    
    // 3rd item should be selected (index 2: By Assignee)
    await expect(listItems.nth(2)).toHaveClass(/selected/);
    await expect(listItems.nth(2)).toHaveText('By Assignee');
    
    // Move up 1 time
    await window.keyboard.press('ArrowUp');
    await expect(listItems.nth(1)).toHaveClass(/selected/);
    await expect(listItems.nth(1)).toHaveText('By Status');
  });

  test('Pressing Enter updates the view title and closes the modal', async () => {
    await window.locator('#grid-container').focus();
    await window.keyboard.press('F8');

    // Move to "By Assignee"
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    
    // Select it
    await window.keyboard.press('Enter');

    // Modal should close
    const modal = window.locator('#view-manager-modal');
    await expect(modal).toHaveClass(/hidden/);

    // Header should update
    await expect(window.locator('#view-title')).toHaveText('By Assignee');

    // Focus should return to grid
    await expect(window.locator('#grid-container')).toBeFocused();
  });
});
