import { by, device, element, expect, waitFor } from 'detox';

/**
 * Account Health flow: account drawer → Profile → settings → Account → health
 * card → Account Health detail. Mirrors mWeb's /account → /account/health.
 */
describe('Account Health flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('opens the Account screen from the profile settings gear', async () => {
    await waitFor(element(by.id('account-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Profile')).tap();
    await waitFor(element(by.id('profile-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('profile-settings')).tap();
    await waitFor(element(by.id('account-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('opens the Account Health detail from the health card', async () => {
    await element(by.id('account-button')).tap();
    await element(by.id('sidebar-item-Profile')).tap();
    await element(by.id('profile-settings')).tap();
    await waitFor(element(by.id('account-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await waitFor(element(by.id('account-health')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('account-health')).tap();

    await waitFor(element(by.id('account-health-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('health-meter'))).toBeVisible();
  });
});
