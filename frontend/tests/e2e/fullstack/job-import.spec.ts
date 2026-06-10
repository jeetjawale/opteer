import { test, expect } from '../fixtures/test';

test.describe('Fullstack: Job Import Operations', () => {
  test('user can import a job and create an application', async ({ page }) => {

    await page.goto('/dashboard');
    await page.goto('/dashboard');

    await page.goto('/applications');
    
    await page.locator('button', { hasText: /Add Posting/i }).click();
    
    await page.fill('input[name="url"], input[placeholder*="URL" i]', 'https://example.com/job/123');
    await page.locator('button', { hasText: /Import|Next|Submit/i }).click();
    
    await expect(page.locator('text=Job imported successfully').or(page.locator('text=Application created'))).toBeVisible({ timeout: 15000 });
  });
});
