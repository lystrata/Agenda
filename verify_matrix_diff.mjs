import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Get Outline HTML
  const outlinerHead = await page.evaluate(() => document.getElementById('grid-head')?.innerHTML || '');
  const outlinerBody = await page.evaluate(() => document.getElementById('grid-body')?.innerHTML || '');
  
  // Open menu and switch
  await page.keyboard.press('/');
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  await page.waitForTimeout(500);
  
  const matrixHead = await page.evaluate(() => document.getElementById('matrix-head')?.innerHTML || '');
  const matrixBody = await page.evaluate(() => document.getElementById('grid-body')?.innerHTML || '');
  
  console.log('--- OUTLINER HEAD ---');
  console.log(outlinerHead);
  console.log('--- MATRIX HEAD ---');
  console.log(matrixHead);
  console.log('--- OUTLINER BODY ---');
  console.log(outlinerBody);
  console.log('--- MATRIX BODY ---');
  console.log(matrixBody);
  
  await browser.close();
})();
