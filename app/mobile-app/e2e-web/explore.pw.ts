import { test, expect } from '@playwright/test';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { exploreFixtures } from './support/data';

test.describe('App · Explore', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGraphql(page, exploreFixtures());
  });

  test('renders the reels feed', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByTestId('explore-reels')).toBeVisible();
    await expect(page.getByTestId('reel-sunset-jam')).toBeVisible();
  });

  test('comments open inline without leaving Explore (bug 17)', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByTestId('reel-comment-sunset-jam')).toBeVisible();
    await page.getByTestId('reel-comment-sunset-jam').click();
    await expect(page.getByTestId('pod-comments-sheet')).toBeVisible();
    // Still on Explore (no redirect to Pod Detail).
    await expect(page.getByTestId('explore-reels')).toBeVisible();
  });
});
