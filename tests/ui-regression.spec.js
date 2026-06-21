const { test, expect } = require('@playwright/test');

test.describe('Lotus Agenda UI Regression', () => {

  test.beforeEach(async ({ page }) => {
    // Load the local HTML file
    await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  });

  test('Grid double-click creates a new item', async ({ page }) => {
    // Verify initial row count
    const initialRows = await page.locator('#grid-body tr').count();
    
    // Double click the empty space in the grid container
    await page.locator('#grid-container').dblclick({ position: { x: 50, y: 500 } });
    
    // Allow a tiny bit of time for rendering
    await page.waitForTimeout(50);
    
    // Verify a new row was added
    const newRows = await page.locator('#grid-body tr').count();
    expect(newRows).toBe(initialRows + 1);
  });

  test('Section Grouping by exclusive category renders (Unassigned) if empty', async ({ page }) => {
    // Add an item to the grid (it will be unassigned for Assignee)
    await page.evaluate(() => {
      window.App.db.addItem('Test item', 0, []);
      window.renderGrid();
    });

    // F8 to open View Manager
    await page.keyboard.press('F8');
    
    // Switch to "By Assignee" view (which groups by 'root-who')
    await page.locator('#view-list li:has-text("By Assignee")').dblclick();
    await page.waitForTimeout(50);
    
    // Verify the grid has an "(Unassigned)" section header since no children exist
    const unassignedHeader = page.locator('#grid-body tr.section-header-row:has-text("(Unassigned)")');
    await expect(unassignedHeader).toBeVisible();
  });

  test('Properties Live Inspector switches context properly', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // F9 to open Category Sidebar
    await page.keyboard.press('F9');
    
    // We should have 'root-when', 'root-who', 'root-status' initially
    // Let's click on 'When' to select it
    await page.locator('#category-tree div', { hasText: 'When' }).click();
    
    // F6 to open Properties Panel
    await page.keyboard.press('F6');
    
    // Panel should show 'Category Properties (F6)' and input should have 'When'
    await expect(page.locator('#panel-title')).toHaveText('Category Properties (F6)');
    await expect(page.locator('#prop-cat-name')).toHaveValue('When');
    
    // Now simulate user clicking 'Who' in the category sidebar (Who is at index 4)
    await page.locator('#category-tree div[data-visible-idx="4"]').click();
    
    // Now the property panel should automatically update to show 'Who'
    await expect(page.locator('#prop-cat-name')).toHaveValue('Who');
  });

});
