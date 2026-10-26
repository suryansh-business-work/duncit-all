import { assertInsideShell, openLogin, submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { openTable } from '../../support/tables';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  gqlRaw,
  grantRoles,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Support › Console access: who may sign in to support.duncit.com.
 *
 * Support admits SUPPORT_MANAGER and the Support Agent role SUPPORT_USER
 * (`appConfig.requiredRoles` and the server's PORTAL_ROLE_REQUIREMENTS.support
 * agree), SUPER_ADMIN passing every portal. The run account is the caller: the
 * spec takes SUPPORT_MANAGER away (it keeps LEGAL_MANAGER and ALL_PODS_ACCESS),
 * then every staff role, then signs in as a Support Agent only — and `after()`
 * hands the account back with the three portal roles and no SUPPORT_USER.
 */

const TICKETS_PAGE = `query E2eTicketsPage { tickets(page: 1, page_size: 1) { total } }`;

const ZERO_ID = '000000000000000000000000';

/** A manager-only write: the mail automation rules (RULE_ROLES = SUPER_ADMIN, SUPPORT_MANAGER). */
const UPDATE_MAIL_RULE = `mutation E2eUpdateMailAutomationRule($input: MailAutomationRuleInput!) {
  updateMailAutomationRule(input: $input) { id }
}`;

describe('Support · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    revokeRoles(account, ['SUPPORT_MANAGER']);
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['SUPPORT_USER']);
  });

  it('SCA-01 an account holding other staff roles but neither support role is refused at the Support sign-in', () => {
    expectUiLoginRefused('support', account);
    apiLoginRaw('support', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('SCA-02 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    apiLoginRaw('support', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('support', account);
  });

  it('SCA-03 /login?denied=1 says the account has no access to Duncit Support', () => {
    expectDeniedBanner('support', 'Duncit Support');
  });

  it('SCA-04 a Support Agent (SUPPORT_USER only) signs in, works the ticket queue, and is refused a manager-only write', () => {
    grantRoles(account, ['SUPPORT_USER']);
    openLogin('support');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('support');
    cy.byTestId('page-header-title').should('have.text', 'Support Dashboard');

    cy.apiPortalLogin('support', account.email, account.password('CHANGED')).then((token) => {
      openTable('support', '/tickets', 'Tickets');
      cy.byTestId('page-header-title').should('have.text', 'Tickets');
      gqlRaw<{ tickets: { total: number } }>('support', TICKETS_PAGE, {}, token).then((body) => {
        expect(body.errors, 'tickets answers a Support Agent').to.be.undefined;
        expect(body.data?.tickets.total).to.be.a('number');
      });
      gqlRaw('support', UPDATE_MAIL_RULE, { input: { id: ZERO_ID } }, token).then((body) =>
        expectRefused(body, 'updateMailAutomationRule', ACCESS_DENIED),
      );
    });
  });
});
