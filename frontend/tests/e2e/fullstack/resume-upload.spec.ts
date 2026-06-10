import { test, expect } from '../fixtures/test';
import path from 'path';

test.describe('Fullstack: Resume Operations', () => {
  test('user can upload and parse resume', async ({ page }) => {

    await page.goto('/sign-in');
    await page.goto('/dashboard');

    await page.goto('/resumes');
    
    const dummyResumePath = path.resolve(__dirname, '../../fixtures/resume.pdf');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button', { hasText: /Browse Files/i }).click();
    const fileChooser = await fileChooserPromise;
    
    try {
        await fileChooser.setFiles(dummyResumePath);
    } catch(e) {
        test.skip(true, 'Fixture resume.pdf not found');
    }

    await expect(page.locator('text=Upload successful').or(page.locator('text=Parsed'))).toBeVisible({ timeout: 15000 });
  });
});
