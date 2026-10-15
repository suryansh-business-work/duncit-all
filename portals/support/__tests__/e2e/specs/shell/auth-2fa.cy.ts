import { assertInsideShell, openLogin } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import {
  apiToken,
  enableTwoFactorApi,
  ensureTwoFactorOff,
  nextTotp,
  passwordDoor,
  runPasswordNow,
  storedToken,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Auth (2FA): the console sign-in's second step
 * (TwoFactorLoginDialog → `ConsoleCompleteTwoFactorLogin`) with the
 * authenticator turned on through the API for this spec. A wrong code and a
 * recovery code already spent are refused with no token stored; an unused
 * recovery code and a fresh app code each sign in; the emailed-code door asks
 * for the same step. `after()` turns two-factor off again with unused recovery
 * codes, so the rest of the suite signs in with the password alone.
 */

describe('Portal Shell · Auth (2FA) (Support, run account)', () => {
  let account: RunAccount;
  let secret = '';
  let lastStep = 0;
  let codes: string[] = [];
  const used = new Set<string>();

  before(() => {
    account = staffAccount();
    passwordDoor('support', account).then(({ challenge }) => {
      if (challenge) throw new Error('Two-factor is already on for the run account; a previous run did not turn it off.');
    });
    apiToken('support', account).then((token) =>
      enableTwoFactorApi('support', token).then((setup) => {
        secret = setup.secret;
        lastStep = setup.step;
        codes = setup.recoveryCodes;
      }),
    );
  });

  after(() => {
    if (account) ensureTwoFactorOff('support', account, codes.filter((code) => !used.has(code)));
  });

  /** Password first, up to the authenticator step. */
  function passwordThenStep(): void {
    openLogin('support');
    cy.byTestId('field-email').type(account.email);
    cy.byTestId('field-password').type(runPasswordNow(account), { log: false });
    cy.byTestId('login-submit').click();
    cy.byTestId('two-factor-login-dialog').should('be.visible');
    storedToken('support').should('equal', null);
  }

  function submitStep(code: string): void {
    cy.byTestId('two-factor-login-code').find('input').clear().type(code);
    cy.interceptOperation('ConsoleCompleteTwoFactorLogin');
    cy.byTestId('two-factor-login-submit').click();
  }

  it('A2F-01 a wrong code is refused with no session; an unused recovery code signs in', () => {
    passwordThenStep();
    // Validation first: neither six digits nor a recovery code.
    cy.byTestId('two-factor-login-code').find('input').type('12');
    cy.byTestId('two-factor-login-submit').click();
    cy.byTestId('two-factor-login-code').should('contain.text', 'Enter the 6-digit code from your app, or a recovery code');

    submitStep('ZZZZ-ZZZZ');
    cy.wait('@ConsoleCompleteTwoFactorLogin').its('response.body.errors.0.message').should('match', /^Incorrect code — \d attempts left$/);
    cy.byTestId('two-factor-login-error').invoke('text').should('match', /^Incorrect code — \d attempts left$/);
    storedToken('support').should('equal', null);

    const [recovery] = codes;
    used.add(recovery);
    submitStep(recovery);
    cy.wait('@ConsoleCompleteTwoFactorLogin').its('response.body.data.completeTwoFactorLogin.token').should('be.a', 'string');
    assertInsideShell('support');
  });

  it('A2F-02 a recovery code works once: used again it is refused; a fresh app code then signs in', () => {
    passwordThenStep();
    submitStep(codes[0]);
    cy.wait('@ConsoleCompleteTwoFactorLogin').its('response.body.errors.0.message').should('match', /^Incorrect code/);
    storedToken('support').should('equal', null);
    nextTotp(secret, lastStep).then(({ code, step }) => {
      lastStep = step;
      submitStep(code);
      cy.wait('@ConsoleCompleteTwoFactorLogin').its('response.body.errors').should('be.undefined');
    });
    assertInsideShell('support');
  });

  it('A2F-03 the emailed-code door asks for the authenticator too, and Cancel leaves no session', () => {
    openLogin('support');
    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email: account.email }).then((before) => {
      cy.byTestId('continue-with-otp').click();
      cy.byTestId('otp-login-email').type(account.email);
      cy.byTestId('recovery-send-code').click();
      cy.readOtp('PORTAL_LOGIN', { email: account.email }, before).then((otp) => {
        cy.byTestId('field-otp').type(otp, { log: false });
        cy.interceptOperation('ConsoleOtpLogin');
        cy.byTestId('recovery-verify-code').click();
        cy.wait('@ConsoleOtpLogin').its('response.body.errors.0.extensions.code').should('eq', 'TWO_FACTOR_REQUIRED');
      });
    });
    cy.byTestId('two-factor-login-dialog').should('be.visible');
    cy.byTestId('otp-login-error').should('not.exist');
    cy.byTestId('two-factor-login-cancel').click();
    cy.byTestId('two-factor-login-dialog').should('not.exist');
    cy.location('pathname').should('eq', '/login');
    storedToken('support').should('equal', null);
  });
});
