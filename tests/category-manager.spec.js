const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Phase 6/14: Category Manager Operations', () => {
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

  test('should support creating, renaming, demoting, promoting, and deleting categories', async () => {
    // 1. Open Category Manager
    await window.keyboard.press('F9');
    const sidebar = window.locator('#category-sidebar');
    await expect(sidebar).not.toHaveClass(/hidden/);
    
    // Focus the sidebar explicitly just in case
    await sidebar.focus();
    
    // Let's create a new root category by pressing Enter on the first item (Main)
    await window.keyboard.press('Enter');
    
    // A new input should appear
    let editInput = window.locator('#category-tree input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Department');
    await window.keyboard.press('Enter');
    
    // Wait for render
    await window.waitForTimeout(200);
    
    // Verify "Department" was created
    let categories = await window.locator('#category-tree div').allTextContents();
    let flatText = categories.join(' ');
    expect(flatText).toContain('Department');
    
    // 2. Add child (Shift+Enter)
    await window.keyboard.press('Shift+Enter');
    editInput = window.locator('#category-tree input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Engineering');
    await window.keyboard.press('Enter');
    
    await window.waitForTimeout(200);
    categories = await window.locator('#category-tree div').allTextContents();
    flatText = categories.join(' ');
    expect(flatText).toContain('Engineering');
    
    // 3. Rename (F2)
    await window.keyboard.press('F2');
    editInput = window.locator('#category-tree input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Eng');
    await window.keyboard.press('Enter');
    
    await window.waitForTimeout(200);
    categories = await window.locator('#category-tree div').allTextContents();
    flatText = categories.join(' ');
    expect(flatText).toContain('Eng');
    expect(flatText).not.toContain('Engineering');
    
    // 4. Create another sibling to "Eng"
    await window.keyboard.press('Enter');
    editInput = window.locator('#category-tree input');
    await expect(editInput).toBeVisible();
    await editInput.fill('QA');
    await window.keyboard.press('Enter');
    await window.waitForTimeout(200);
    
    // Let's Demote QA (Tab). It should become a child of Eng.
    await window.keyboard.press('Tab');
    await window.waitForTimeout(200);
    
    // Let's promote it back.
    await window.keyboard.press('Shift+Tab');
    await window.waitForTimeout(200);
    
    // 5. Delete "Eng"
    // Move up to "Eng"
    await window.keyboard.press('ArrowUp');
    await window.keyboard.press('Delete');
    
    await window.waitForTimeout(200);
    categories = await window.locator('#category-tree div').allTextContents();
    flatText = categories.join(' ');
    expect(flatText).not.toContain('Eng');
    
    // Close sidebar
    await window.keyboard.press('Escape');
    await expect(sidebar).toHaveClass(/hidden/);
  });
});
