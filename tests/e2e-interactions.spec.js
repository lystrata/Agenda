const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('E2E UI Interactions', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    // Launch the compiled Electron application
    electronApp = await electron.launch({
      executablePath: '/Users/rohn/Applications/Lotus Agenda.app/Contents/MacOS/Lotus Agenda'
    });
    page = await electronApp.firstWindow();
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
    });
    page.on('pageerror', exception => {
      console.log(`UNCAUGHT EXCEPTION: ${exception}`);
    });
    
    // Give it a moment to initialize the DB and render
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Grid Interactions - Selecting and Modifying', async () => {
    // Wait for the grid to be visible
    const gridBody = page.locator('#grid-body');
    await expect(gridBody).toBeVisible();

    // Check that we have at least one row or can create one
    const rows = page.locator('.grid-row');
    const rowCount = await rows.count();
    console.log(`Initial row count: ${rowCount}`);
    
    if (rowCount === 0) {
      console.log('Dispatching double click to create row...');
      // Create an item by dispatching a double click on the container directly
      await page.evaluate(() => {
        document.getElementById('grid-container').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      });
      await page.waitForTimeout(1000); // Wait longer for the row to be rendered
      console.log(`Row count after double click: ${await rows.count()}`);
    }
    
    // Select the first row's first cell in the body
    const firstCell = page.locator('#grid-body .grid-row').first().locator('.grid-cell').first();
    console.log('Clicking first cell...');
    await firstCell.click();
    
    // Verify it became active
    await expect(firstCell).toHaveClass(/active-cell/);
  });

  test('F8 View Manager Modal', async () => {
    // Press F8
    await page.keyboard.press('F8');
    
    // Wait for modal
    const modal = page.locator('#view-manager-modal');
    await expect(modal).toBeVisible();
    
    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('F7 Filters Modal', async () => {
    // Press F7
    await page.keyboard.press('F7');
    
    // Wait for modal
    const modal = page.locator('#filter-modal');
    await expect(modal).toBeVisible();
    
    // Type a filter
    await page.locator('#filter-text').fill('test');
    
    // Apply and close via Enter
    await page.keyboard.press('Enter');
    await expect(modal).toBeHidden();
  });

  test('Sidebar & Resizer - Category Manager (F9)', async () => {
    // Press F9 to toggle Categories
    await page.keyboard.press('F9');
    
    const sidebar = page.locator('#category-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveClass(/hidden/);

    // Test Left Resizer
    const resizer = page.locator('#resizer-left');
    await expect(resizer).toBeVisible();
    await expect(resizer).not.toHaveClass(/hidden/);
    
    // Perform a drag to resize
    const sidebarBoxBefore = await sidebar.boundingBox();
    const resizerBox = await resizer.boundingBox();
    
    // Drag it 50 pixels to the right
    await page.mouse.move(resizerBox.x + 2, resizerBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(resizerBox.x + 52, resizerBox.y + 10, { steps: 5 });
    await page.mouse.up();
    
    const sidebarBoxAfter = await sidebar.boundingBox();
    expect(sidebarBoxAfter.width).toBeGreaterThan(sidebarBoxBefore.width);

    // Press F9 to close
    await page.keyboard.press('F9');
    await expect(sidebar).toHaveClass(/hidden/);
  });

  test('Sidebar & Resizer - Properties Panel (F6)', async () => {
    // Press F6 to toggle Properties
    await page.keyboard.press('F6');
    
    const panel = page.locator('#properties-panel');
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveClass(/hidden/);

    // Test Right Resizer
    const resizer = page.locator('#resizer-right');
    await expect(resizer).toBeVisible();
    await expect(resizer).not.toHaveClass(/hidden/);
    
    // Perform a drag to resize
    const panelBoxBefore = await panel.boundingBox();
    const resizerBox = await resizer.boundingBox();
    
    // Drag it 50 pixels to the left
    await page.mouse.move(resizerBox.x + 2, resizerBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(resizerBox.x - 48, resizerBox.y + 10, { steps: 5 });
    await page.mouse.up();
    
    const panelBoxAfter = await panel.boundingBox();
    expect(panelBoxAfter.width).toBeGreaterThan(panelBoxBefore.width);

    // Press F6 to close
    await page.keyboard.press('F6');
    await expect(panel).toHaveClass(/hidden/);
  });
});
