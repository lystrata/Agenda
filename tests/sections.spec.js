const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Phase 14: Dynamic View Sections', () => {
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

  test('should render section headers, group items, and support collapsing', async () => {
    // 1. Focus grid and add some items
    await window.locator('#grid-container').focus();
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    
    // Add Item 1: Finish quarterly report (assign to John)
    await window.keyboard.press('Enter');
    let editInput = window.locator('td.active-cell input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Finish quarterly report');
    await window.keyboard.press('Enter');
    
    // Assign "John" via F6
    await window.keyboard.press('F6');
    await window.locator('#prop-assignee').fill('John');
    await window.keyboard.press('Escape');
    
    await window.waitForTimeout(200);
    await window.keyboard.press('ArrowDown');
    
    // Add Item 2: Email boss (assign to Mary)
    await window.keyboard.press('Enter');
    editInput = window.locator('td.active-cell input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Email boss');
    await window.keyboard.press('Enter');
    
    await window.keyboard.press('F6');
    await window.locator('#prop-assignee').fill('Mary');
    await window.keyboard.press('Escape');
    
    // 2. Switch to 'By Assignee' view using F8
    await window.keyboard.press('F8');
    const viewModal = window.locator('#view-manager-modal');
    await expect(viewModal).not.toHaveClass(/hidden/);
    
    // By Assignee is index 2 (Main View, By Status, By Assignee)
    await window.keyboard.press('ArrowDown'); 
    await window.keyboard.press('ArrowDown'); 
    await window.keyboard.press('Enter');
    
    // Wait for render
    await window.waitForTimeout(500);
    
    // 3. Verify Grouping
    const headers = await window.locator('.section-header-row strong').allTextContents();
    expect(headers).toContain('JOHN');
    expect(headers).toContain('MARY');
    
    // 4. Verify Collapsing
    const johnToggle = window.locator('tr.section-header-row').filter({ hasText: 'JOHN' }).locator('span');
    await johnToggle.click();
    
    await window.waitForTimeout(200);
    
    const textContext = await window.locator('#grid-body').textContent();
    expect(textContext).not.toContain('Finish quarterly report'); // It should be hidden
    expect(textContext).toContain('Email boss'); // Mary's task should still be visible
  });
});
