import { test, expect } from '@playwright/test';

test.describe('Application Operations', () => {
  test('user can import a job and create an application', async ({ page }) => {

    

    await page.goto('/sign-in');

    await page.goto('/applications');
    
    // Test the Add Application flow
    await page.locator('button', { hasText: /Add Posting/i }).click();
    
    // Fill in a public job URL
    await page.fill('input[name="url"], input[placeholder*="URL" i]', 'https://example.com/job/123');
    
    // Submit the form
    await page.locator('button', { hasText: /Import|Next|Submit/i }).click();
    
    // Verify successful creation
    await expect(page.locator('text=Job imported successfully').or(page.locator('text=Application created'))).toBeVisible({ timeout: 15000 });
  });
});
