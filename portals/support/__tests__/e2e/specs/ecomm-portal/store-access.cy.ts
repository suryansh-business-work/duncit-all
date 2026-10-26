import type { RunAccount } from '../../support/run-account';
import {
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  grantRoles,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';
import {
  ECOMM_PORTAL_FULL_NAME,
  STORE_CONSOLE_READS,
  expectReadsRefused,
  expectSessionDenied,
  expectSignedOutRedirect,
  tokenFrom,
} from '../../support/ui-products-ecomm';

/**
 * E-commerce › Store access: who may open the Duncit Pet Store's console
 * (ecomm-portal.duncit.com, which runs ecomm.duncit.com).
 *
 * The console admits ECOMM_STORE_MANAGER only (SUPER_ADMIN passes every
 * portal) and every store* resolver runs requireStoreAdmin with the same two
 * roles. Neither can be granted to a run account, so the console's own rows are
 * not automated; this spec proves the refusals — above all that the Partner
 * Brand role ECOMM_MANAGER, which every approved brand partner holds on
 * partners-app /ecomm-brand, does NOT open the pet store or read its orders,
 * customers, payments or settings. `after()` hands the account back with the
 * three portal roles.
 */

describe('E-commerce · Store access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['ECOMM_MANAGER']);
  });

  it('ESA-01 signed out, a deep link to the store orders lands on /login carrying the path back', () => {
    expectSignedOutRedirect('ecomm-portal', '/orders');
  });

  it('ESA-02 an account holding Support, Legal and Pods roles is refused at the E-commerce sign-in', () => {
    apiLoginRaw('ecomm-portal', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('ecomm-portal', account);
  });

  it('ESA-03 a staff session without the store role is denied by the shell and refused every store read', () => {
    tokenFrom('support', account).then((token) => {
      expectReadsRefused('ecomm-portal', STORE_CONSOLE_READS, token);
      expectSessionDenied('ecomm-portal', '/', token, ECOMM_PORTAL_FULL_NAME);
    });
  });

  it('ESA-04 a Partner Brand owner (ECOMM_MANAGER only) is refused the pet store console at sign-in', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    grantRoles(account, ['ECOMM_MANAGER']);
    apiLoginRaw('ecomm-portal', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('ecomm-portal', account);
  });

  it('ESA-05 the Partner Brand session cannot read the store dashboard, orders, customers, payments or settings', () => {
    // The brand owner's own door is the Partners app; that token is real and carries ECOMM_MANAGER.
    tokenFrom('partners', account).then((token) => {
      expectReadsRefused('ecomm-portal', STORE_CONSOLE_READS, token);
      expectSessionDenied('ecomm-portal', '/orders', token, ECOMM_PORTAL_FULL_NAME);
    });
  });

  it('ESA-06 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['ECOMM_MANAGER']);
    apiLoginRaw('ecomm-portal', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('ecomm-portal', account);
  });

  it('ESA-07 /login?denied=1 says the account has no access to Duncit E-commerce', () => {
    expectDeniedBanner('ecomm-portal', ECOMM_PORTAL_FULL_NAME);
  });
});
