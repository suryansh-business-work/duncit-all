import { openLogin, submitPassword } from '../support/login-page';
import { runAccount, type RunAccount } from '../support/run-account';

/**
 * Runs after the mWeb delete spec deleted the account and purged it: the
 * password it last held no longer opens the Partners console.
 */
describe('Partners · after mWeb deleted the account', () => {
  let account: RunAccount;

  before(() => {
    account = runAccount();
  });

  it('AD-07(P) password sign-in shows Invalid email or password', () => {
    openLogin();
    submitPassword(account.email, account.password('CHANGED'));
    cy.byTestId('login-error').should('be.visible').and('contain.text', 'Invalid email or password');
    cy.location('pathname').should('eq', '/login');
  });
});
