import { test, expect } from '@playwright/test';
import { mockGraphql } from './support/gql';
import { seedAuth } from './support/auth';
import { bootFixtures } from './support/data';

// Native geolocation in Bengaluru; the reverse-geocode is routed to a city/pincode
// that matches the seeded location (loc1, which has active pods).
test.use({ geolocation: { latitude: 12.97, longitude: 77.59 }, permissions: ['geolocation'] });

test.describe('Location', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGraphql(page, bootFixtures);
    await page.route(/maps\.googleapis\.com\/maps\/api\/geocode/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          results: [
            {
              address_components: [
                { long_name: 'Bengaluru', short_name: 'Bengaluru', types: ['locality'] },
                { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
                { long_name: 'India', short_name: 'IN', types: ['country'] },
                { long_name: '560001', short_name: '560001', types: ['postal_code'] },
              ],
            },
          ],
        }),
      }),
    );
    await page.route(/maps\.googleapis\.com\/maps\/api\/js/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    );
  });

  test('the location dialog lists the available city', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Change city or zone/i }).click();
    await expect(page.getByText('Choose your location')).toBeVisible();
    await expect(page.getByText('Bengaluru').first()).toBeVisible();
  });

  test('"Use my location" applies a city that has active pods (bug 5)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Change city or zone/i }).click();
    await page.getByRole('button', { name: /Use my location/i }).click();
    // loc1 has live pods → it auto-applies, closes the dialog and stays on Home.
    await expect(page.getByText('Choose your location')).not.toBeVisible();
    await expect(page.getByText('Happening nearby')).toBeVisible();
  });
});
