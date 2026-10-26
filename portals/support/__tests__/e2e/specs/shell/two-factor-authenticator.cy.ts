import { assertInsideShell, openLogin } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import {
  COMPLETE_TWO_FACTOR_API,
  RECOVERY_CODE,
  asAccount,
  ensureTwoFactorOff,
  keepSession,
  nextTotp,
  openSignedIn,
  passwordDoor,
  readRecoveryCodes,
  runPasswordNow,
  storedToken,
  totpCode,
  totpStepNow,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Two-factor (authenticator), on Support, end to end through the
 * UI: Profile › Security sets the authenticator up (the secret shown on screen
 * is turned into codes by an RFC 6238 helper in ui-shell.ts — no app needed),
 * the next password sign-in asks for the code, and turning it off needs a
 * current code. The tests run in order and share the account's two-factor
 * state (the secret and recovery codes are kept in the spec); `after()` always
 * leaves two-factor OFF (spending unused recovery codes if a step failed), so
 * every later spec signs in with the password alone.
 */

describe('Portal Shell · Two-factor (authenticator) (Support, run account)', () => {
  let account: RunAccount;
  let secret = '';
  let lastStep = 0;
  let codes: string[] = [];
  const used = new Set<string>();
  const unused = () => codes.filter((code) => !used.has(code));

  before(() => {
    account = staffAccount();
    passwordDoor('support', account).then(({ challenge }) => {
      if (challenge) throw new Error('Two-factor is already on for the run account; a previous run did not turn it off.');
    });
  });

  after(() => {
    if (account) ensureTwoFactorOff('support', account, unused());
  });

  it('TFA-01 Security sets up the authenticator: a wrong first code is refused, the right one turns it on and shows ten recovery codes once', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/profile?selectedtab=security');
    cy.byTestId('profile-two-factor-state').should('have.text', 'Off');
    cy.interceptOperation('ShellStartTwoFactorSetup');
    cy.byTestId('profile-two-factor-setup').click();
    cy.wait('@ShellStartTwoFactorSetup');
    cy.byTestId('two-factor-qr').should('have.attr', 'src').and('match', /^data:image\/png;base64,/);
    cy.byTestId('two-factor-secret')
      .invoke('text')
      .then((text) => {
        secret = text.trim();
        expect(secret).to.match(/^[A-Z2-7]{32}$/);
        // A code from another key is a wrong code for this one.
        totpCode('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', totpStepNow()).then((wrong) => {
          cy.byTestId('two-factor-enable-code').find('input').type(wrong);
          cy.byTestId('two-factor-enable-submit').click();
          cy.byTestId('two-factor-enable-error').should('have.text', 'That code does not match. Check the app and try again.');
        });
        lastStep = totpStepNow();
        totpCode(secret, lastStep).then((code) => {
          cy.byTestId('two-factor-enable-code').find('input').clear().type(code);
          cy.interceptOperation('ShellEnableTwoFactor');
          cy.byTestId('two-factor-enable-submit').click();
          cy.wait('@ShellEnableTwoFactor').its('response.body.errors').should('be.undefined');
        });
      });
    readRecoveryCodes().then((list) => {
      codes = list;
      expect(list).to.have.length(10);
      for (const code of list) expect(code).to.match(RECOVERY_CODE);
    });
    cy.byTestId('two-factor-setup-close').should('have.text', "I've saved them").click();
    cy.byTestId('two-factor-setup-dialog').should('not.exist');
    cy.byTestId('profile-two-factor-state').should('have.text', 'On');
    cy.byTestId('profile-two-factor-status').should('contain.text', 'Recovery codes left: 10.');
  });

  it('TFA-02 the password now opens the authenticator step, and its code signs in', () => {
    if (!secret) throw new Error('TFA-01 did not turn two-factor on.');
    openLogin('support');
    cy.byTestId('field-email').type(account.email);
    cy.byTestId('field-password').type(runPasswordNow(account), { log: false });
    cy.interceptOperation('ConsoleLogin');
    cy.byTestId('login-submit').click();
    cy.wait('@ConsoleLogin').its('response.body.errors.0.extensions.code').should('eq', 'TWO_FACTOR_REQUIRED');
    cy.byTestId('two-factor-login-dialog').should('be.visible').and('contain.text', 'Two-step verification');
    storedToken('support').should('equal', null);
    nextTotp(secret, lastStep).then(({ code, step }) => {
      lastStep = step;
      cy.byTestId('two-factor-login-code').find('input').type(code);
      cy.interceptOperation('ConsoleCompleteTwoFactorLogin');
      cy.byTestId('two-factor-login-submit').click();
      cy.wait('@ConsoleCompleteTwoFactorLogin').its('response.body.data.completeTwoFactorLogin.token').should('be.a', 'string');
    });
    assertInsideShell('support');
  });

  it('TFA-03 turning it off refuses a wrong code and accepts a current one; the next sign-in needs only the password', () => {
    if (codes.length < 2) throw new Error('TFA-01 did not show the recovery codes.');
    passwordDoor('support', account).then(({ challenge }) => {
      if (!challenge) throw new Error('Two-factor is not on; there is nothing to turn off.');
      const [entry] = unused();
      used.add(entry);
      asAccount<{ completeTwoFactorLogin: { token: string } }>('support', '', COMPLETE_TWO_FACTOR_API, {
        input: { challenge_token: challenge, code: entry },
      }).then((done) => keepSession('support', done.completeTwoFactorLogin.token));
    });
    openSignedIn('support', '/profile?selectedtab=security');
    cy.byTestId('profile-two-factor-disable').click();
    cy.byTestId('two-factor-disable-dialog').should('contain.text', 'Turn off authenticator app?');
    cy.byTestId('two-factor-disable-code').find('input').type('ZZZZ-ZZZZ');
    cy.byTestId('two-factor-disable-submit').click();
    cy.byTestId('two-factor-disable-error').invoke('text').should('match', /^Incorrect code — \d attempts? left$/);
    nextTotp(secret, lastStep).then(({ code, step }) => {
      lastStep = step;
      cy.byTestId('two-factor-disable-code').find('input').clear().type(code);
      cy.interceptOperation('ShellDisableTwoFactor');
      cy.byTestId('two-factor-disable-submit').click();
      cy.wait('@ShellDisableTwoFactor').its('response.body.data.disableTwoFactor.two_factor_enabled').should('eq', false);
    });
    cy.byTestId('two-factor-disable-dialog').should('not.exist');
    cy.byTestId('profile-two-factor-state').should('have.text', 'Off');
    passwordDoor('support', account).then(({ token, challenge }) => {
      expect(challenge, 'no second step any more').to.equal(null);
      expect(token).to.be.a('string');
    });
  });
});
