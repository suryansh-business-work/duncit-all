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
  PRODUCTS_CONSOLE_READS,
  PRODUCTS_FULL_NAME,
  expectReadsRefused,
  expectSessionDenied,
  expectSignedOutRedirect,
  grantCityAdmin,
  tokenFrom,
} from '../../support/ui-products-ecomm';

/**
 * Products › Access & navigation: who may open products.duncit.com (Duncit
 * catalogue and the Partner Brand review desk).
 *
 * The console admits PRODUCTS_MANAGER only — appConfig.requiredRoles and the
 * server's PORTAL_ROLE_REQUIREMENTS.products agree — and SUPER_ADMIN passes
 * every portal. Neither role can be granted to a run account, so every row that
 * works inside the console is not automated here; this spec proves the
 * refusals for the roles a run account CAN hold: the three portal roles, a
 * city-scoped CITY_ADMIN (which the server lets read several product resolvers
 * but which the console still turns away), the Partner Brand ECOMM_MANAGER, and
 * a plain member. `after()` hands the account back with the three portal roles.
 */

describe('Products · Access & navigation (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['ECOMM_MANAGER', 'CITY_ADMIN']);
  });

  it('PRA-01 signed out, a deep link to Duncit products lands on /login carrying the path back', () => {
    expectSignedOutRedirect('products', '/inventory');
  });

  it('PRA-02 an account holding Support, Legal and Pods roles but not PRODUCTS_MANAGER is refused at sign-in', () => {
    apiLoginRaw('products', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('products', account);
  });

  it('PRA-03 a session without the role is denied by the shell: token cleared, denied banner, back on /login', () => {
    tokenFrom('support', account).then((token) => expectSessionDenied('products', '/', token, PRODUCTS_FULL_NAME));
  });

  it('PRA-04 that session cannot read what the console shows: every products read answers Access Denied', () => {
    tokenFrom('support', account).then((token) => expectReadsRefused('products', PRODUCTS_CONSOLE_READS, token));
  });

  it('PRA-05 a city-scoped CITY_ADMIN is still refused at the Products sign-in', () => {
    grantCityAdmin(account);
    apiLoginRaw('products', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('products', account);
    revokeRoles(account, ['CITY_ADMIN']);
  });

  it('PRA-06 a Partner Brand owner (ECOMM_MANAGER only) is refused the console and every products read', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    grantRoles(account, ['ECOMM_MANAGER']);
    apiLoginRaw('products', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('products', account);
    // The Partners app is the brand owner's own door, so it signs in there.
    tokenFrom('partners', account).then((token) => {
      expectReadsRefused('products', PRODUCTS_CONSOLE_READS, token);
      expectSessionDenied('products', '/ecomm/brands', token, PRODUCTS_FULL_NAME);
    });
  });

  it('PRA-07 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['ECOMM_MANAGER']);
    apiLoginRaw('products', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('products', account);
  });

  it('PRA-08 /login?denied=1 says the account has no access to Duncit Products', () => {
    expectDeniedBanner('products', PRODUCTS_FULL_NAME);
  });
});
