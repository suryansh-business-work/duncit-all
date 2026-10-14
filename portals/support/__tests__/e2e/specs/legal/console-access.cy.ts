import { assertInsideShell, openLogin, submitPassword } from '../../support/login-page';
import { grantStaffRoles, type RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  gqlRaw,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Legal › Console access: who may sign in to legal.duncit.com.
 *
 * The portal admits LEGAL_MANAGER (SUPER_ADMIN passes every portal), on the
 * client (`appConfig.requiredRoles`) and on the server (`assertPortalLogin`
 * with portal_key legal). The run account is the caller: LEGAL_MANAGER is taken
 * away for the refusals — it still holds SUPPORT_MANAGER and ALL_PODS_ACCESS, two
 * other staff roles — then everything is taken away for the plain-member case,
 * and `after()` hands it back with the three portal roles.
 */

const LEGAL_DOCUMENTS_PAGE = `query E2eLegalDocumentsPage {
  legalDocumentsTable(query: { page: 1, page_size: 1 }) { total }
}`;

describe('Legal · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    revokeRoles(account, ['LEGAL_MANAGER']);
  });

  after(() => {
    if (account) restoreStaffRoles(account);
  });

  it('LCA-01 an account holding other staff roles but not LEGAL_MANAGER is refused at the Legal sign-in', () => {
    expectUiLoginRefused('legal', account);
  });

  it('LCA-02 the server refuses that sign-in too, and a token from another portal cannot read legal records', () => {
    apiLoginRaw('legal', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    // Support still admits the account, which yields a real token without the role.
    apiLoginRaw('support', account).then((body) => {
      const token = body.data?.login?.token ?? null;
      expect(token, 'the Support sign-in still works').to.be.a('string');
      gqlRaw('legal', LEGAL_DOCUMENTS_PAGE, {}, token).then((page) =>
        expectRefused(page, 'legalDocumentsTable', ACCESS_DENIED),
      );
    });
  });

  it('LCA-03 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'ALL_PODS_ACCESS']);
    apiLoginRaw('legal', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('legal', account);
  });

  it('LCA-04 /login?denied=1 says the account has no access to Duncit Legal', () => {
    expectDeniedBanner('legal', 'Duncit Legal');
  });

  it('LCA-05 given LEGAL_MANAGER again, the account signs in and lands on the Legal Dashboard', () => {
    grantStaffRoles(account);
    openLogin('legal');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('legal');
    cy.byTestId('page-header-title').should('have.text', 'Legal Dashboard');
  });
});
