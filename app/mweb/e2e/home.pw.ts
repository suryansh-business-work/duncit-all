import { test, expect } from '@playwright/test';
import { mockGraphql, blockThirdParty } from './support/gql';
import { seedAuth } from './support/auth';
import { bootFixtures, homeFeed, upcomingPod } from './support/data';

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await seedAuth(page);
    await mockGraphql(page, bootFixtures);
  });

  test('renders the home shell, status rail and live pods', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Happening nearby')).toBeVisible();
    await expect(page.getByText("What's your vibe today?")).toBeVisible();
    await expect(page.getByText('Jazz Club').first()).toBeVisible();
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
  });

  test('vibe chips include an "All" filter (bug 11) and only categories with pods (bug 6)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Music', exact: true })).toBeVisible();
    // Sports has no pods in the fixture → its chip is hidden.
    await expect(page.getByRole('button', { name: 'Sports', exact: true })).toHaveCount(0);
  });

  test('"Happening nearby" header opens the Explore page (bug 9)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open Happening nearby' }).click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test('Previous Pods rail + dedicated page show past pods (bug 8)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Previous Pods').first()).toBeVisible();
    await page.getByRole('button', { name: /See all/i }).click();
    await expect(page).toHaveURL(/\/previous-pods/);
    await expect(page.getByText('Old Gig').first()).toBeVisible();
  });

  test('empty feed shows the no-clubs notice', async ({ page }) => {
    await mockGraphql(page, { ...bootFixtures, HomeFeed: homeFeed({ pods: [] }) });
    await page.goto('/');
    await expect(page.getByText(/No clubs in this category/i)).toBeVisible();
  });

  test('header logo returns to home (bug 7)', async ({ page }) => {
    await page.goto('/previous-pods');
    await expect(page.getByText('Previous Pods').first()).toBeVisible();
    await page.getByRole('button', { name: 'Go to home and refresh' }).click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByText('Happening nearby')).toBeVisible();
  });

  test('renders only upcoming pods when there are no past pods', async ({ page }) => {
    await mockGraphql(page, { ...bootFixtures, HomeFeed: homeFeed({ pods: [upcomingPod] }) });
    await page.goto('/');
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
    await expect(page.getByText('Previous Pods')).toHaveCount(0);
  });
});
