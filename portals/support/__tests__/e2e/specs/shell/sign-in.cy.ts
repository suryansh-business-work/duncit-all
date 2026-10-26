import { assertInsideShell, openLogin } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { runPasswordNow, storedToken } from '../../support/ui-shell';
import { countOperation, expectNotSent, gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Sign in: the console login screen every portal mounts
 * (@duncit/shell PortalLoginPage around @duncit/user-context LoginScreen),
 * driven on Support. The password door posts `ConsoleLogin`; the emailed-code
 * door posts `ConsoleRequestLoginOtp` then `ConsoleOtpLogin`, and the code is
 * read back from the e2e held-code API (purpose PORTAL_LOGIN).
 */

const OTP_LOGIN_API = `mutation E2eOtpLogin($input: PortalLoginOtpInput!) {
  loginWithPortalOtp(input: $input) { token }
}`;

/** user.credentials.ts loginWithPortalOtp — wrong, spent, expired and cross-portal codes alike. */
const INVALID_CODE = 'Invalid or expired code';

/** Open the code panel and ask for a code, returning when the server answered. */
function requestCode(email: string): void {
  cy.byTestId('continue-with-otp').click();
  cy.byTestId('otp-login-email').type(email);
  cy.interceptOperation('ConsoleRequestLoginOtp');
  cy.byTestId('recovery-send-code').click();
  cy.wait('@ConsoleRequestLoginOtp').its('response.body.errors').should('be.undefined');
  cy.byTestId('otp-login-code-sent').should('contain.text', 'If that address can sign in here, a 6-digit code is on its way.');
}

describe('Portal Shell · Sign in (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('SI-01 empty and malformed fields are refused before any request, and Forgot password explains itself', () => {
    const login = countOperation('ConsoleLogin');
    openLogin('support');
    cy.byTestId('login-submit').click();
    cy.byTestId('email-error').should('have.text', 'E-mail address is required');
    cy.byTestId('password-error').should('have.text', 'Password is required');
    cy.byTestId('field-email').type('not-an-address');
    cy.byTestId('email-error').should('have.text', 'Enter a valid e-mail address');
    cy.byTestId('field-password').type('anything');
    cy.byTestId('password-error').should('not.exist');
    cy.byTestId('login-submit').click();
    cy.location('pathname').should('eq', '/login');
    expectNotSent(login, 'ConsoleLogin');

    cy.byTestId('go-forgot-password').click();
    cy.byTestId('login-snackbar').should('contain.text', 'Contact your administrator to reset your password.');
    // autoHideDuration 4000 in LoginScreen.tsx.
    cy.byTestId('login-snackbar', { timeout: 8000 }).should('not.exist');
  });

  it('SI-02 a wrong password and an unknown address get the same red alert, and no session is stored', () => {
    openLogin('support');
    cy.byTestId('field-email').type(account.email);
    cy.byTestId('field-password').type(`${runPasswordNow(account)}-wrong`, { log: false });
    cy.interceptOperation('ConsoleLogin');
    cy.byTestId('login-submit').click();
    cy.wait('@ConsoleLogin').its('response.body.errors.0.message').should('eq', 'Invalid email or password');
    cy.byTestId('login-error').should('have.text', 'Invalid email or password');

    cy.byTestId('field-email').clear().type(`nobody-${account.stamp}@e2e.invalid`);
    cy.interceptOperation('ConsoleLogin', 'UnknownLogin');
    cy.byTestId('login-submit').click();
    cy.wait('@UnknownLogin').its('response.body.errors.0.message').should('eq', 'Invalid email or password');
    cy.byTestId('login-error').should('have.text', 'Invalid email or password');
    cy.location('pathname').should('eq', '/login');
    storedToken('support').should('equal', null);
  });

  it('SI-03 an emailed code signs in to the same session a password gives, and is single use', () => {
    openLogin('support');
    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email: account.email }).then((before) => {
      requestCode(account.email);
      cy.readOtp('PORTAL_LOGIN', { email: account.email }, before).then((code) => {
        cy.byTestId('recovery-verify-code').should('be.disabled');
        cy.byTestId('field-otp').type(code, { log: false });
        cy.interceptOperation('ConsoleOtpLogin');
        cy.byTestId('recovery-verify-code').should('be.enabled').click();
        cy.wait('@ConsoleOtpLogin').its('response.body.data.loginWithPortalOtp.token').should('be.a', 'string');
        assertInsideShell('support');
        // The code was spent on the way in.
        gqlRaw('support', OTP_LOGIN_API, { input: { email: account.email, otp: code, portal_key: 'support' } }, null).then(
          (body) => expect(body.errors?.[0]?.message, 'the same code a second time').to.equal(INVALID_CODE),
        );
      });
    });
  });

  it('SI-04 a wrong code is refused, spends the code, and the panel folds back to the button', () => {
    openLogin('support');
    cy.byTestId('continue-with-otp').click();
    cy.byTestId('otp-login-email').type('not-an-address');
    cy.byTestId('recovery-send-code').should('be.disabled');
    cy.byTestId('otp-login-email').clear();
    cy.byTestId('otp-login-use-password').click();
    cy.byTestId('continue-with-otp').should('be.visible');

    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email: account.email }).then((before) => {
      requestCode(account.email);
      cy.readOtp('PORTAL_LOGIN', { email: account.email }, before).then((code) => {
        const wrong = code === '000000' ? '111111' : '000000';
        cy.byTestId('field-otp').type(wrong);
        cy.interceptOperation('ConsoleOtpLogin');
        cy.byTestId('recovery-verify-code').click();
        cy.wait('@ConsoleOtpLogin').its('response.body.errors.0.message').should('eq', INVALID_CODE);
        cy.byTestId('otp-login-error').should('have.text', INVALID_CODE);
        storedToken('support').should('equal', null);
        // A wrong guess burns the real code too.
        gqlRaw('support', OTP_LOGIN_API, { input: { email: account.email, otp: code, portal_key: 'support' } }, null).then(
          (body) => expect(body.errors?.[0]?.message, 'the real code after a wrong guess').to.equal(INVALID_CODE),
        );
      });
    });
    cy.byTestId('otp-login-use-password').click();
    cy.byTestId('continue-with-otp').should('be.visible');
    cy.byTestId('field-otp').should('not.exist');
  });

  it('SI-05 a code issued for Support does not open Legal, which the account can also reach', () => {
    openLogin('support');
    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email: account.email }).then((before) => {
      requestCode(account.email);
      cy.readOtp('PORTAL_LOGIN', { email: account.email }, before).then((code) =>
        gqlRaw('legal', OTP_LOGIN_API, { input: { email: account.email, otp: code, portal_key: 'legal' } }, null).then(
          (body) => {
            expect(body.errors?.[0]?.message, 'a Support code at Legal').to.equal(INVALID_CODE);
            expect(body.data?.loginWithPortalOtp ?? null).to.be.null;
          },
        ),
      );
    });
  });

  it('SI-06 the sign-in returns to the page the person asked for; the login page itself is never a target', () => {
    cy.clearAuth();
    cy.visitPortal('support', '/faqs/submissions');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/faqs/submissions')}`);
    cy.byTestId('field-email').type(account.email);
    cy.byTestId('field-password').type(runPasswordNow(account), { log: false });
    cy.interceptOperation('ConsoleLogin');
    cy.byTestId('login-submit').click();
    cy.wait('@ConsoleLogin');
    cy.location('pathname').should('eq', '/faqs/submissions');

    // getSafeRedirectPath (lib/redirect.ts): /login and protocol-relative targets fall back to '/'.
    for (const target of ['/login', '//example.com/x']) {
      cy.clearAuth();
      cy.visitPortal('support', `/login?redirect=${encodeURIComponent(target)}`);
      cy.byTestId('field-email').type(account.email);
      cy.byTestId('field-password').type(runPasswordNow(account), { log: false });
      cy.byTestId('login-submit').click();
      assertInsideShell('support');
    }
  });

  it('SI-07 the card carries the colour toggle, the legal links, the support address and the Other portals launcher', () => {
    openLogin('support');
    cy.byTestId('login-color-mode').click();
    cy.window().its('localStorage').invoke('getItem', 'support_color_mode').should('eq', 'light');
    cy.byTestId('login-color-mode').click();
    cy.window().its('localStorage').invoke('getItem', 'support_color_mode').should('eq', 'dark');

    cy.byTestId('login-privacy-link').should('have.attr', 'target', '_blank').and('have.text', 'Privacy Policy');
    cy.byTestId('login-terms-link').should('have.attr', 'target', '_blank').and('have.text', 'Terms of Use');
    cy.byTestId('login-support-email').should('have.attr', 'href').and('match', /^mailto:\S+@\S+$/);

    cy.window().then((win) => cy.stub(win, 'open').as('windowOpen'));
    cy.byTestId('login-other-portals').click();
    cy.byTestId('other-portals-dialog').should('be.visible');
    cy.byTestId('other-portals-card-developers').click();
    // Local previews resolve every console to its port (portals.ts resolvePortalUrl); same tab.
    cy.get('@windowOpen').should('have.been.calledOnceWith', 'http://localhost:2027/', '_self');
  });
});
