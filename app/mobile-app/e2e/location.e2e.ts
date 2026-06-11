import { by, device, element, expect, waitFor } from 'detox';

describe('Location flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Scenario 1: opens the app and shows the home screen', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Duncit Location Demo'))).toBeVisible();
  });

  it('Scenario 2: fetches and displays coordinates', async () => {
    await element(by.id('get-location-button')).tap();
    await waitFor(element(by.id('permission-status')))
      .toHaveText('granted')
      .withTimeout(10000);
    await expect(element(by.id('latitude-value'))).toBeVisible();
    await expect(element(by.id('longitude-value'))).toBeVisible();
  });

  it('Scenario 3: sends the location and shows a success response', async () => {
    await element(by.id('get-location-button')).tap();
    await waitFor(element(by.id('permission-status')))
      .toHaveText('granted')
      .withTimeout(10000);
    await element(by.id('send-location-button')).tap();
    await waitFor(element(by.id('api-response')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('Scenario 4: shows an error when permission is denied', async () => {
    await device.launchApp({ newInstance: true, permissions: { location: 'never' } });
    await element(by.id('get-location-button')).tap();
    await waitFor(element(by.id('error-state')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('Scenario 5: shows an error when the API call fails', async () => {
    // Backend unreachable in CI -> sendLocation surfaces an ApiError in the panel.
    await element(by.id('get-location-button')).tap();
    await waitFor(element(by.id('permission-status')))
      .toHaveText('granted')
      .withTimeout(10000);
    await element(by.id('send-location-button')).tap();
    await waitFor(element(by.id('error-state')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
