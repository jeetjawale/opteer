import { test, expect } from '../fixtures/test';
import { configureApiKey } from '../helpers';

test.describe('Fullstack: Job Import Operations', () => {
  test('user can import a job and create an application', async ({ page }) => {

    await page.goto('/dashboard');
    await configureApiKey(page);

    await page.goto('/applications');
    
    await page.locator('button', { hasText: /Add Posting/i }).click();
    
    await page.fill('input[type="url"]', 'https://corporate.target.com/jobs/w83/68/apprentice-technology');
    await page.locator('button', { hasText: 'Import' }).click();
    
    await expect(page.locator('text=Import Job Posting')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.group.cursor-grab').first()).toBeVisible({ timeout: 15000 });
  });
});
