import { test, expect } from '@playwright/test';
import { configureApiKey } from '../helpers';

test.describe('Application Operations', () => {
  test('user can import a job and create an application', async ({ page }) => {

    await page.goto('/dashboard');
    await configureApiKey(page);

    await page.goto('/applications');
    
    // Test the Add Application flow
    await page.locator('button', { hasText: /Add Posting/i }).click();
    
    // Fill in a public job URL
    await page.fill('input[type="url"]', 'https://corporate.target.com/jobs/w83/68/apprentice-technology');
    await page.locator('button', { hasText: 'Import' }).click();
    
    // Verify successful creation
    await expect(page.locator('text=Job imported successfully').or(page.locator('text=Application created'))).toBeVisible({ timeout: 15000 });
  });
});
