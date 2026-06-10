import { test, expect } from '../fixtures/test';

test.describe('Fullstack: Settings Flow', () => {
  test('user can update settings', async ({ page }) => {

    await page.goto('/sign-in');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

    // Go to settings
    await page.goto('/settings');
    
    // Change a setting
    await page.locator('input[type="text"]').last().fill('Test');
    await page.locator('button', { hasText: /Update Profile/i }).click();

    // Verify button goes back to "Update Profile"
    await expect(page.locator('button', { hasText: 'Update Profile' })).toBeVisible({ timeout: 15000 });
  });
});
