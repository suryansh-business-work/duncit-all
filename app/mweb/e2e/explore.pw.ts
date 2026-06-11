import { test, expect } from '@playwright/test';
import { mockGraphql, blockThirdParty } from './support/gql';
import { seedAuth } from './support/auth';
import { exploreFixtures } from './support/data';

test.describe('Explore', () => {
  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await seedAuth(page);
    await mockGraphql(page, exploreFixtures());
  });

  test('renders the reels feed with a pod', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
    await expect(page.getByText('Jazz Club').first()).toBeVisible();
  });

  test('comments open inline without leaving Explore (bug 17)', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
    await page.locator('button:has([data-testid="CommentIcon"])').first().click();
    // The comments sheet opens in place — heading shows and the URL stays /explore.
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible();
    await expect(page).toHaveURL(/\/explore/);
  });
});
