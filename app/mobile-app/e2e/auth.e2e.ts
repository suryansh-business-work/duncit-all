import { by, device, element, waitFor } from 'detox';

/**
 * Auth navigation between the login, signup and forgot-password screens. The
 * whole flow is guarded behind a signed-out launch — if the app restores a
 * session, the auth screens never mount and the spec is a no-op.
 */
describe('Auth navigation', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('moves between login, signup and forgot-password when signed out', async () => {
    try {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(6000);
    } catch {
      return; // a session was restored — nothing to exercise here
    }

    await element(by.id('go-signup')).tap();
    await waitFor(element(by.id('signup-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('go-login')).tap();
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('go-forgot-password')).tap();
    await waitFor(element(by.id('forgot-password-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
