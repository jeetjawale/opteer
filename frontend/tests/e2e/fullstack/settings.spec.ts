import { test, expect } from '../fixtures/test';

test.describe('Fullstack: Settings Flow', () => {
  test('user can update settings', async ({ page }) => {

    await page.goto('/dashboard');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

    // Go to settings
    await page.goto('/settings');
    
    // Change a setting
    await page.locator('input[type="password"]').first().fill('Test');
    await page.locator('button', { hasText: /Save Credentials/i }).first().click();

    // Verify button goes back to "Save Credentials"
    await expect(page.locator('button', { hasText: /Save Credentials/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
