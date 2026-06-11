import { test, expect } from '@playwright/test';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { homeFixtures } from './support/data';

test.describe('App · Home', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGraphql(page, homeFixtures());
  });

  test('signed-in boot renders the Home tab + status rail', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-feed')).toBeVisible();
    await expect(page.getByTestId('status-mine')).toBeVisible();
  });

  test('vibe chips include the "All" filter (bug 11)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('vibe-chip-all')).toBeVisible();
  });

  test('"Happening nearby" header is tappable (bug 9)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('happening-nearby-header')).toBeVisible();
  });

  test('Previous Pods rail shows past pods with a "See all" (bug 8)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('previous-pods-see-all')).toBeVisible();
  });
});
