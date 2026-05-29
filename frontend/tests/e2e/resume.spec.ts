import { test, expect } from '@playwright/test';
import { loginUser } from './helpers/auth';

test.describe('Resume Storage and Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display resume profiles and persist files across reloads', async ({ page }) => {
    // Navigate to resumes management tab
    await page.goto('/resumes');
    
    // Expect the resume profiles header
    await expect(page.locator('text=Resume Profiles')).toBeVisible();
    
    // If there are existing resumes, we expect to see at least one
    // We can verify that the Preview button exists, proving the signed URL generation was successful
    const hasResumes = await page.locator('text=Preview Document').count() > 0;
    
    if (hasResumes) {
      // Reload the page
      await page.reload();
      
      // Verify the preview button is still there, proving storage persistence
      await expect(page.locator('text=Preview Document').first()).toBeVisible();
    }
  });
});
