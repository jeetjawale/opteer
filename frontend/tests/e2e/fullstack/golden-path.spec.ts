import { test, expect } from '../fixtures/test';
import path from 'path';

test.describe('Fullstack: Golden Path', () => {

  test('golden path: login -> upload -> import -> verify', async ({ page }) => {

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', exception => {
      console.error(`Uncaught Exception: ${exception.message}`);
    });

    page.on('requestfailed', request => {
      console.error(`REQUEST FAILED: ${request.method()} ${request.url()}`);
    });

    // 1. Navigate to Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

    const { configureApiKey } = require('../helpers');
    await configureApiKey(page);

    // 2. Upload Resume
    await page.goto('/resumes');
    const dummyResumePath = path.resolve(__dirname, '../../fixtures/resume.txt');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button', { hasText: /Browse Files/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(dummyResumePath);
    await expect(page.locator('text=Uploading Resume...')).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(page.locator('text=Uploading Resume...')).toBeHidden({ timeout: 60000 });
    await expect(page.locator('text=Upload successful').or(page.locator('text=Parsed'))).toBeVisible({ timeout: 60000 });

    // 3. Import Job & Application Created
    await page.goto('/applications');
    await page.locator('button', { hasText: /Add Posting/i }).click();
    await page.fill('input[type="url"]', 'https://corporate.target.com/jobs/w83/68/apprentice-technology');
    // Ensure the resume dropdown has loaded and we select the first available resume (index 1 because 0 is "No Resume")
    await page.locator('select').selectOption({ index: 1 }, { timeout: 15000 });
    await page.locator('button', { hasText: 'Import' }).click();
    await expect(page.locator('text=Import Job Posting')).toBeHidden({ timeout: 60000 });
    await page.waitForSelector('.group.cursor-grab', { state: 'visible', timeout: 15000 });

    // 4. Verify the application card exists on the board
    const applicationCard = page.locator('.group.cursor-grab').first();
    await expect(applicationCard).toBeVisible();
  });
});
