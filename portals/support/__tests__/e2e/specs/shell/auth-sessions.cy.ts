import { submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { CONNECTED_ACCOUNTS_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Auth (sessions), on Support: the Change password dialog's
 * refusals — a wrong current password, a wrong emailed code, a confirmation
 * that does not match, and a new password equal to the current one — leave
 * the password as it was; and Sign-in activity reports the sign-in that opened
 * this session. Nothing is changed: the dialog is closed after the refusals.
 */

describe('Portal Shell · Auth (sessions) (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('ASN-01 wrong current password, wrong code, mismatched and unchanged passwords are all refused; the password stays', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/profile?selectedtab=security');
    cy.byTestId('profile-change-password').click();
    cy.byTestId('change-password-current').find('input').type(`${runPasswordNow(account)}-wrong`, { log: false });
    cy.interceptOperation('ShellRequestPasswordChangeOtp');
    cy.byTestId('current-password-submit').click();
    cy.wait('@ShellRequestPasswordChangeOtp').its('response.body.errors.0.message').should('eq', 'Current password is incorrect');
    cy.byTestId('current-password-error').should('have.text', 'Current password is incorrect');

    cy.byTestId('change-password-current').find('input').clear().type(runPasswordNow(account), { log: false });
    cy.lastOtpIssuedAt('PASSWORD_CHANGE', { email: account.email }).then((before) => {
      cy.interceptOperation('ShellRequestPasswordChangeOtp', 'CodeSent');
      cy.byTestId('current-password-submit').click();
      cy.wait('@CodeSent');
      cy.readOtp('PASSWORD_CHANGE', { email: account.email }, before).then((otp) => {
        const wrong = otp === '000000' ? '111111' : '000000';
        const next = `${runPasswordNow(account)}-N1`;

        // Confirmation that does not match: refused before any request.
        const change = countOperation('ShellChangePasswordWithOtp');
        cy.byTestId('change-password-otp').find('input').type(wrong);
        cy.byTestId('change-password-new').find('input').type(next, { log: false });
        cy.byTestId('change-password-confirm').find('input').type(`${next}x`, { log: false });
        cy.byTestId('new-password-submit').click();
        cy.byTestId('change-password-confirm').should('contain.text', 'Passwords do not match');
        // The same password as now: refused in the dialog.
        cy.byTestId('change-password-new').find('input').clear().type(runPasswordNow(account), { log: false });
        cy.byTestId('change-password-confirm').find('input').clear().type(runPasswordNow(account), { log: false });
        cy.byTestId('new-password-submit').click();
        cy.byTestId('new-password-error').should('have.text', 'Your new password must be different from your current one.');
        expectNotSent(change, 'ShellChangePasswordWithOtp');

        // A wrong code: refused by the server.
        cy.byTestId('change-password-new').find('input').clear().type(next, { log: false });
        cy.byTestId('change-password-confirm').find('input').clear().type(next, { log: false });
        cy.interceptOperation('ShellChangePasswordWithOtp');
        cy.byTestId('new-password-submit').click();
        cy.wait('@ShellChangePasswordWithOtp').its('response.body.errors.0.message').should('eq', 'Invalid OTP');
        cy.byTestId('new-password-error').should('have.text', 'Invalid OTP');
      });
    });
    cy.get('body').type('{esc}');
    cy.byTestId('change-password-dialog').should('not.exist');
    // Still the run password.
    apiToken('support', account).should('be.a', 'string');
  });

  it('ASN-02 Sign-in activity reports the password sign-in that opened this session', () => {
    cy.clearAuth();
    cy.visitPortal('support', '/login?redirect=%2Fprofile%3Fselectedtab%3Dsecurity');
    submitPassword(account.email, runPasswordNow(account));
    cy.location('pathname').should('eq', '/profile');
    cy.byTestId('profile-last-sign-in').should('contain.text', 'Last signed in').and('contain.text', '· with password');
    apiToken('support', account).then((token) =>
      asAccount<{ myConnectedAccounts: { last_login_at: string; last_login_provider: string } }>(
        'support',
        token,
        CONNECTED_ACCOUNTS_API,
      ).then(({ myConnectedAccounts }) => {
        expect(myConnectedAccounts.last_login_provider).to.equal('EMAIL');
        expect(Date.now() - new Date(myConnectedAccounts.last_login_at).getTime(), 'signed in just now').to.be.lessThan(5 * 60_000);
      }),
    );
  });
});
