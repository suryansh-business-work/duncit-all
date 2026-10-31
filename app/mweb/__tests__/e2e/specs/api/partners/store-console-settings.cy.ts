/// <reference types="cypress" />
import { revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { expectStoreAdminOnly, type StoreCall } from '../../../support/api-partners';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The pet store console's (ecomm-portal) dashboard, settings, Autoship plans
 * and policy pages — never the Partner Brand console. Each runs
 * `requireStoreAdmin` (SUPER_ADMIN, ECOMM_STORE_MANAGER), neither grantable
 * to a run account, so the console side is asserted as refusals to a
 * signed-out caller, a member, a Partner Brand partner (ECOMM_MANAGER) and
 * other staff (CITY_ADMIN); no setting, page or plan changes. The console's
 * sign-in refusing ECOMM_MANAGER is store-admin-access SAD-01. The storefront
 * side asserts that what the console may save is what the store serves: the
 * public settings sit inside the bounds the console enforces (Autoship at most
 * 50% off, rhythms of 1–26 weeks) and an unknown page slug serves nothing.
 * Scenario map: Ecomm Portal › Settings & Access (store settings and autoship
 * terms, portal access and dashboard, content pages).
 */

const CONSOLE: readonly StoreCall[] = [
  ['storeDashboard', `query E2eSeDashboard { storeDashboard(days: 7) { to_ship revenue } }`],
  ['storeAdminSettings', `query E2eSeSettings { storeAdminSettings { store_enabled } }`],
  ['storeSaveSettings', `mutation E2eSeSave { storeSaveSettings(input: { store_enabled: false }) { store_enabled } }`],
  ['storeAdminRazorpayAccounts', `query E2eSeRazorpay { storeAdminRazorpayAccounts { id } }`],
  ['storeSubscriptionsTable', `query E2eSeSubs { storeSubscriptionsTable(query: { page_size: 1 }) { total } }`],
  [
    'storeAdminSetSubscriptionStatus',
    `mutation E2eSeSubStatus($id: ID!) { storeAdminSetSubscriptionStatus(id: $id, status: PAUSED) { id } }`,
    { id: NO_ID },
  ],
  ['storeSavePage', `mutation E2eSePage { storeSavePage(input: { title: "Size guide" }) { id } }`],
  ['storeDeletePage', `mutation E2eSePageDel($id: ID!) { storeDeletePage(id: $id) }`, { id: NO_ID }],
  ['storeReorderPages', `mutation E2eSePageOrder($ids: [ID!]!) { storeReorderPages(ids: $ids) }`, { ids: [NO_ID] }],
];

const PUBLIC = `query E2eSePublic {
  storeSettings { store_enabled store_name autoship_enabled autoship_discount_pct autoship_frequencies returns_enabled return_window_days max_qty_per_line }
}`;
const PAGE = `query E2eSePageRead($slug: String!) { storePage(slug: $slug) { slug } }`;

interface PublicSettings {
  store_enabled: boolean;
  store_name: string;
  autoship_enabled: boolean;
  autoship_discount_pct: number;
  autoship_frequencies: number[];
  returns_enabled: boolean;
  return_window_days: number;
  max_qty_per_line: number;
}

describe('API · Pet store settings, dashboard and pages are the store team’s alone', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['CITY_ADMIN']).then((token) => {
      cityAdminToken = token;
    });
    revokeRunRoles(['CITY_ADMIN']);
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('ES-01 the dashboard, settings, Autoship plans and pages refuse everyone without a store role', () => {
    expectStoreAdminOnly(CONSOLE, [memberToken, partnerToken, cityAdminToken]);
  });

  it('ES-02 the refused "store closed" save left the store open, and its public terms sit inside the console’s bounds', () => {
    cy.gql<{ storeSettings: PublicSettings }>(PUBLIC, {}, { token: null })
      .its('storeSettings')
      .then((s) => {
        expect(s.store_enabled, 'the store is still open').to.equal(true);
        expect(s.store_name, 'store name').to.be.a('string').and.not.be.empty;
        expect(s.autoship_discount_pct, 'Autoship discount').to.be.within(0, 50);
        s.autoship_frequencies.forEach((weeks) => {
          expect(Number.isInteger(weeks) && weeks >= 1 && weeks <= 26, `rhythm ${weeks} weeks`).to.equal(true);
        });
        expect(Number.isInteger(s.return_window_days) && s.return_window_days >= 0, 'return window').to.equal(true);
        expect(s.max_qty_per_line, 'per-line limit').to.be.at.least(1);
      });
  });

  it('ES-03 a page slug the store has no live page for serves nothing', () => {
    cy.gql<{ storePage: unknown }>(PAGE, { slug: `e2e-no-page-${runAccount().stamp}` }, { token: null }).then((data) => {
      expect(data.storePage, 'no page').to.be.null;
    });
  });
});
