import { test, expect } from '@playwright/test';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { homeFixtures, story } from './support/data';

test.describe('App · Stories', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('a followed story tile opens the full-screen viewer (bugs 1-4)', async ({ page }) => {
    await mockGraphql(page, homeFixtures({ stories: [story] }));
    await page.goto('/');
    await page.getByTestId('status-u2').click();
    await expect(page.getByTestId('status-viewer')).toBeVisible();
    await page.getByTestId('status-viewer-close').click();
    await expect(page.getByTestId('status-viewer')).toHaveCount(0);
  });

  test('the "Your story" tile is always present for uploading', async ({ page }) => {
    await mockGraphql(page, homeFixtures());
    await page.goto('/');
    await expect(page.getByTestId('status-mine')).toBeVisible();
    await expect(page.getByTestId('status-mine-badge')).toBeVisible();
  });
});
