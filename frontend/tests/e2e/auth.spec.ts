import { test, expect } from '@playwright/test';
import { TEST_USER, loginUser } from './helpers/auth';

test.describe('Authentication Flows', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    await loginUser(page);
    // User should be navigated to dashboard
    await expect(page).toHaveURL(/\/applications/);
  });

  test('should block login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongPassword1!');
    await page.click('button[type="submit"]');
    
    // An error message should appear
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
  });
});
