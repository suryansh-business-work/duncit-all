/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  expectCallsRefused,
  expectRead,
  expectRolesRefused,
  PLATFORM_FINANCE_ONLY,
} from '../../../support/api-staff';

/**
 * Finance › Food Menu Defaults (GST) — the default GST on venue food orders.
 * Read by FINANCE_READ (SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER, FINANCE_USER);
 * changed through ADMIN_RW and then assertPlatformFinanceWrite, which turns a
 * city-bound admin away because the default applies to every city
 * (finance/finance/finance.resolver.ts updateFoodTaxDefaults, finance/financeScope.ts).
 * Scenario map: Staff › Food Menu Defaults (GST) "GST rate out of range or
 * unknown tax mode is refused", "Non-finance role cannot change food tax defaults".
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'FINANCE_USER', 'ZONAL_ADMIN', 'SUPPORT_USER', 'LOGS_MANAGER'];
const TAX_MODES = ['INCLUSIVE', 'EXCLUSIVE'];

const READ = call('foodTaxDefaults', `query E2eFoodTaxDefaults { foodTaxDefaults { tax_mode gst_pct } }`);
const updateWith = (gstPct: number) =>
  call(
    'updateFoodTaxDefaults',
    `mutation E2eUpdateFoodTax($gst: Int!) { updateFoodTaxDefaults(input: { tax_mode: EXCLUSIVE, gst_pct: $gst }) { __typename } }`,
    { gst: gstPct },
  );
const UNKNOWN_MODE = `mutation E2eUnknownTaxMode { updateFoodTaxDefaults(input: { tax_mode: E2E_NO_SUCH_MODE, gst_pct: 5 }) { __typename } }`;

describe('API · Food menu GST defaults', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('GST-01 a tax mode outside FoodTaxMode is rejected by the schema before any resolver runs', () => {
    cy.gqlRaw(UNKNOWN_MODE, {}, { token: memberToken }).then((body) => {
      const [error] = body.errors ?? [];
      expect(error?.extensions?.code, 'schema validation code').to.equal('GRAPHQL_VALIDATION_FAILED');
      expect(error?.message, 'names the enum').to.contain('FoodTaxMode');
      expect(body.data ?? null, 'nothing executed').to.be.null;
    });
  });

  it('GST-02 CITY_ADMIN reads the defaults but cannot change them, whatever the rate', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ tax_mode: string; gst_pct: number }>(token, READ).then((defaults) => {
        expect(TAX_MODES, 'stored tax mode').to.include(defaults.tax_mode);
        expect(defaults.gst_pct, 'stored GST %').to.be.within(0, 28);
      });
      // Refused as platform-wide before the rate is validated: in range or not, nothing is written.
      expectCallsRefused(token, [updateWith(5), updateWith(99), updateWith(-1)], PLATFORM_FINANCE_ONLY);
    });
  });

  it('GST-03 FINANCE_USER, the analyst seat, reads the defaults and is refused changing them', () => {
    asRole('FINANCE_USER', (token) => {
      expectRead(token, READ);
      expectCallsRefused(token, [updateWith(5)]);
    });
  });

  it('GST-04 ZONAL_ADMIN, SUPPORT_USER and LOGS_MANAGER are refused reading and changing the defaults', () => {
    expectRolesRefused(['ZONAL_ADMIN', 'SUPPORT_USER', 'LOGS_MANAGER'], [READ, updateWith(5)]);
  });
});
