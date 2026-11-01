/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead } from '../../../support/api-staff';

/**
 * Analytics console (analytics.duncit.com) — who signs in, who reads which
 * dashboard, and how a dashboard's reporting period is checked.
 *
 * The console's server login gate admits ANALYTICS_MANAGER only (SUPER_ADMIN
 * passes every gate): portals/portal.constants.ts `analytics`. entityAnalytics
 * asks `entityReaders(entity)` (platform/analytics/entity/entityAnalytics.resolver.ts):
 * the Analytics staff for every page, plus LOGS_MANAGER for LOGS, the user
 * managers for USERS, COMMUNICATIONS_MANAGER for COMMUNICATIONS. analyticsCities
 * and a goal on a page the caller cannot read are the Analytics staff's only.
 * The period is resolved by entity/window.ts resolvePeriod: a preset `days` is
 * clamped to 7–365 (30 when absent), a custom from–to is yyyy-MM-dd, ordered,
 * not in the future and at most a year.
 *
 * ANALYTICS_MANAGER cannot be granted to a run account (server e2eRun.staff.ts),
 * so the period rules are read through LOGS_MANAGER on the LOGS page — the same
 * resolver and the same resolvePeriod. Nothing here writes: a goal is only ever
 * asked for on a page the caller is refused.
 *
 * Scenario map: Analytics › Access ("Analytics console login refused for roles
 * outside requiredRoles", "CITY_ADMIN and MARKETING_MANAGER cannot read entity
 * analytics"); Analytics › Dashboards ("Open each dashboard with period presets
 * and a custom range", "Set a KPI target" — role refusal half).
 * CITY_ADMIN reading the Users page is authorization.cy.ts AZ-02.
 */

interface Period {
  days: number;
  from: string;
  to: string;
  previous_from: string;
  previous_to: string;
}

const ENTITY = `query E2eAnalyticsPage($entity: AnalyticsEntity!, $days: Int, $from: String, $to: String) {
  entityAnalytics(entity: $entity, days: $days, from: $from, to: $to) {
    entity
    period { days from to previous_from previous_to }
    kpis { key }
  }
}`;

const page = (entity: string, period: Record<string, unknown> = {}) =>
  call('entityAnalytics', ENTITY, { entity, ...period });
const CITIES = call('analyticsCities', `query E2eAnalyticsCityList { analyticsCities { id name } }`);
const goal = (entity: string) =>
  call(
    'setAnalyticsTarget',
    `mutation E2eAnalyticsGoal($entity: AnalyticsEntity!) { setAnalyticsTarget(entity: $entity, key: "e2e", value: 1) }`,
    { entity },
  );

const badPeriod = (message: string) => ({ code: 'BAD_USER_INPUT', message });

const DAY_MS = 24 * 60 * 60 * 1000;
/** yyyy-MM-dd `n` days before now — far enough back that no time zone puts it in the future. */
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'CRM_MANAGER', 'LOGS_MANAGER'];

describe('API · The Analytics console: its sign-in, its readers and its periods', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('ANC-01 the console refuses a member, a city admin and the CRM seat at sign-in', () => {
    cy.useRunTraffic();
    expectPortalRefused('analytics');
    asRole('CITY_ADMIN', () => expectPortalRefused('analytics'));
    asRole('CRM_MANAGER', () => expectPortalRefused('analytics'));
  });

  it('ANC-02 a dashboard, the city list and a goal are refused signed out and to a member', () => {
    [page('PODS'), CITIES, goal('PODS')].forEach((c) => {
      cy.gqlRaw(c.query, c.variables, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
      cy.gqlRaw(c.query, c.variables, { token: memberToken }).then((body) =>
        expectRefused(c.field, body, ACCESS_DENIED),
      );
    });
  });

  it('ANC-03 a city admin and the CRM seat are refused the Pods and Revenue pages, the city list and a goal', () => {
    asRole('CITY_ADMIN', (token) =>
      expectCallsRefused(token, [page('PODS'), page('REVENUE'), CITIES, goal('REVENUE')]),
    );
    asRole('CRM_MANAGER', (token) =>
      expectCallsRefused(token, [page('PODS'), page('USERS'), CITIES, goal('PODS')]),
    );
  });

  it('ANC-04 the Logs seat reads its own page and no other, and may not set a goal on another page', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ entity: string; kpis: unknown[] }>(token, page('LOGS')).then((analytics) => {
        expect(analytics.entity, 'the page answered').to.equal('LOGS');
        expect(analytics.kpis, 'the page carries its tiles').to.be.an('array');
      });
      expectCallsRefused(token, [page('PODS'), page('SHOP'), CITIES, goal('PODS')]);
    });
  });

  it('ANC-05 a preset period is clamped to 7–365 days, and no period reads the last 30', () => {
    asRole('LOGS_MANAGER', (token) => {
      const daysOf = (period: Record<string, unknown>, expected: number, label: string) =>
        expectRead<{ period: Period }>(token, page('LOGS', period)).then(({ period: read }) => {
          expect(read.days, label).to.equal(expected);
          expect(Date.parse(read.to) - Date.parse(read.from), `${label}: the window spans its days`).to.be.closeTo(
            expected * DAY_MS,
            DAY_MS,
          );
          expect(read.previous_to, `${label}: the comparison ends where the period starts`).to.equal(read.from);
        });
      daysOf({ days: 3 }, 7, '3 days asks for the 7-day minimum');
      daysOf({ days: 90 }, 90, '90 days');
      daysOf({ days: 999 }, 365, '999 days asks for the 365-day maximum');
      daysOf({}, 30, 'no period');
    });
  });

  it('ANC-06 a custom range reads exactly its days; a malformed, reversed or over-long one is refused', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectRead<{ period: Period }>(token, page('LOGS', { from: daysAgo(10), to: daysAgo(10) })).then(({ period }) => {
        expect(period.days, 'a one-day range').to.equal(1);
      });
      expectRead<{ period: Period }>(token, page('LOGS', { from: daysAgo(20), to: daysAgo(11) })).then(({ period }) => {
        expect(period.days, 'a ten-day range, both ends included').to.equal(10);
      });
      const refused: Array<[Record<string, unknown>, string]> = [
        [{ from: '10/01/2026', to: daysAgo(10) }, 'Dates must be written yyyy-MM-dd.'],
        [{ from: daysAgo(5), to: daysAgo(10) }, 'The start date must be on or before the end date, and not in the future.'],
        [{ from: daysAgo(500), to: daysAgo(10) }, 'A range can cover at most a year.'],
      ];
      refused.forEach(([period, message]) => {
        const c = page('LOGS', period);
        cy.gqlRaw(c.query, c.variables, { token }).then((body) => expectRefused(c.field, body, badPeriod(message)));
      });
    });
  });
});
