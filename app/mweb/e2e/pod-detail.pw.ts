import { test, expect } from '@playwright/test';
import { mockGraphql, blockThirdParty } from './support/gql';
import { seedAuth } from './support/auth';
import { podDetailFixtures, product } from './support/data';

const POD_URL = '/club/jazz-club/pod/sunset-jam';

test.describe('Pod Detail', () => {
  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await seedAuth(page);
  });

  test('renders the pod with a Time & Venue section (bug 13)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures());
    await page.goto(POD_URL);
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
    await expect(page.getByText('Time & Venue')).toBeVisible();
    await expect(page.getByText('When', { exact: true })).toBeVisible();
    await expect(page.getByText('Where', { exact: true })).toBeVisible();
  });

  test('hides the Pod Shop when there are no products (bug 12)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures({ product_requests: [] }));
    await page.goto(POD_URL);
    await expect(page.getByText('Sunset Jam').first()).toBeVisible();
    await expect(page.getByText(/Pod Shop|Products/i)).toHaveCount(0);
  });

  test('shows the Pod Shop when the pod has products (bug 12)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures({ products_enabled: true, product_requests: [product] }));
    await page.goto(POD_URL);
    await expect(page.getByText('Vinyl Record').first()).toBeVisible();
  });

  test('shows a Club Details section with the club (bug 15)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures());
    await page.goto(POD_URL);
    await page.getByRole('button', { name: /Expand all/i }).click();
    await expect(page.getByText('Jazz Club').first()).toBeVisible();
  });

  test('share button is present on the pod (bug 14)', async ({ page }) => {
    await mockGraphql(page, podDetailFixtures());
    await page.goto(POD_URL);
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  });
});
