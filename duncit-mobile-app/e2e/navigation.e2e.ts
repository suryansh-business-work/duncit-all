import { by, device, element, expect, waitFor } from 'detox';

/**
 * Signed-in shell navigation: the floating bottom-tab bar (Home · Explore ·
 * Clubs · Chats · Following) and the account drawer. Mirrors mWeb's tabbed shell.
 */
describe('Bottom-tab navigation', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Scenario 1: lands on the signed-in shell with the tab bar', async () => {
    await waitFor(element(by.id('app-header')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('tab-bar-HomeTab'))).toBeVisible();
    await expect(element(by.id('tab-bar-Explore'))).toBeVisible();
  });

  it('Scenario 2: switches to Explore and back to Home', async () => {
    await element(by.id('tab-bar-Explore')).tap();
    await waitFor(element(by.id('explore-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('tab-bar-Following')).tap();
    await waitFor(element(by.id('following-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('tab-bar-HomeTab')).tap();
    await waitFor(element(by.id('app-header')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('Scenario 3: opens and closes the account drawer', async () => {
    await element(by.id('account-button')).tap();
    await expect(element(by.id('sidebar-panel'))).toBeVisible();

    await element(by.id('sidebar-close')).tap();
    await waitFor(element(by.id('app-header')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
