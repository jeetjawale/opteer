import { test, expect } from '../fixtures/test';
import { Client } from 'pg';
import path from 'path';

test.describe('Fullstack: Golden Path', () => {
  let dbClient: Client;

  test.beforeAll(async () => {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();
  });

  test.afterAll(async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });

  test('golden path: login -> upload -> import -> create -> analyze -> verify', async ({ page }) => {

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

    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/api/')) {
        console.error(`API Error: ${response.status()} ${response.url()}`);
      }
    });
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

    // 4. Run Analysis
    await page.locator('.group.cursor-grab').first().click();
    await page.waitForURL(/\/jobs\/[a-zA-Z0-9-]+/);
    
    const url = page.url();
    const appIdMatch = url.match(/\/jobs\/([a-f0-9\-]+)/);
    const appId = appIdMatch ? appIdMatch[1] : null;
    
    await page.locator('button', { hasText: /Re-run Analysis/i }).click();

    // 5. Worker Completes & DB Check
    if (appId) {
        let status = 'saved';
        for (let i = 0; i < 30; i++) {
            const res = await dbClient.query('SELECT analysis_status, status FROM applications WHERE id = $1', [appId]);
            if (res.rows.length > 0) {
                status = res.rows[0].analysis_status || res.rows[0].status;
                if (status === 'completed' || status === 'processed') break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        expect(['completed', 'processed']).toContain(status);
    }

    // 6. Results Visible
    await expect(page.locator('text=AI Fit Analysis').or(page.locator('text=Analysis Complete'))).toBeVisible({ timeout: 120000 });
  });
});
