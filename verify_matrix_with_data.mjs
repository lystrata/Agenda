import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set window size to a reasonable desktop size
  await page.setViewportSize({ width: 1280, height: 800 });
  
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Expose a function to import the TODO.md file directly into the DB to bypass Electron dialogs
  const mdText = fs.readFileSync(path.join(process.cwd(), 'MD/TODO.md'), 'utf-8');
  await page.evaluate((md) => {
    window.AgendaMarkdownParser.parse(window.App.db, md);
    window.renderCategoryTree();
    window.renderGrid();
  }, mdText);
  
  // Wait a moment for rendering
  await page.waitForTimeout(500);
  
  // Switch to Matrix View via keyboard shortcuts
  await page.keyboard.press('/');
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  
  // Wait for Matrix view to render
  await page.waitForTimeout(1000);
  
  // Take a screenshot of the grid container
  await page.locator('#grid-container').screenshot({ path: 'matrix_view_test_with_data.png' });
  
  // Also take a full page screenshot
  await page.screenshot({ path: 'matrix_view_test_full.png' });
  
  // Print outerHTML of the grid to check structure
  const gridHtml = await page.evaluate(() => {
    const table = document.querySelector('#grid-container table');
    return table ? table.outerHTML : 'NO TABLE FOUND';
  });
  
  fs.writeFileSync('grid_html_dump.txt', gridHtml);
  
  await browser.close();
})();
