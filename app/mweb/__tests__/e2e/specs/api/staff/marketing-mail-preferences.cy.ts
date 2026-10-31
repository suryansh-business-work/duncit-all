/// <reference types="cypress" />
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead } from '../../../support/api-staff';

/**
 * Marketing › Mail Preferences analytics (content/mailPreference): the
 * opt-out report and the per-change log, read by SUPER_ADMIN, CITY_ADMIN and
 * MARKETING_MANAGER (mailPreference.resolver.ts ANALYTICS_ROLES).
 *
 * The change the report is checked against is the run account's own: it
 * re-confirms a category it already receives (setMyMailPreference enabled:
 * true). That writes one log row and changes nothing else — an opt-IN never
 * sends the confirmation email an opt-out does (mailPreference.service.ts
 * apply), so no mail goes anywhere.
 *
 * Scenario map: Marketing › Mail Preferences analytics.
 */

const MY_PREFS = `query E2eMyMailPrefs { myMailPreferences { email categories { category required enabled } } }`;
const SET_MINE = `mutation E2eSetMailPref($category: String!) { setMyMailPreference(category: $category, enabled: true) { categories { category enabled } } }`;
const ME = `query E2eMailMe { me { user_id } }`;
const ANALYTICS = (range: number) =>
  call(
    'mailPreferenceAnalytics',
    `query E2eMailAnalytics { mailPreferenceAnalytics(range_days: ${range}) {
      range_days people_opted_out people_opted_out_all opt_outs opt_ins
      by_category { category opted_out_now opt_outs opt_ins } by_source { key count }
    } }`,
  );
const LOGS = call(
  'mailPreferenceLogsTable',
  `query E2eMailLogs($search: String) { mailPreferenceLogsTable(query: { search: $search, page_size: 5 }) {
    total rows { email user_id category enabled source created_at }
  } }`,
);

const SOURCES = ['MWEB', 'NATIVE', 'WEBSITE', 'PORTAL', 'SERVER'];

interface Report {
  range_days: number;
  people_opted_out: number;
  people_opted_out_all: number;
  opt_outs: number;
  opt_ins: number;
  by_category: Array<{ category: string; opted_out_now: number; opt_outs: number; opt_ins: number }>;
  by_source: Array<{ key: string; count: number }>;
}

describe('API · Mail preference analytics count the change a person just made', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['CITY_ADMIN', 'SUPPORT_USER']);
  });

  it('MMP-01 a re-confirmed category is logged for that person, newest first, and counted as an opt-in for the day', () => {
    cy.gql<{ myMailPreferences: { email: string; categories: Array<{ category: string; required: boolean; enabled: boolean }> } }>(
      MY_PREFS,
      {},
      { token: memberToken },
    ).then(({ myMailPreferences }) => {
      const pick = myMailPreferences.categories.find((c) => !c.required && c.enabled);
      expect(pick, 'a category the run account can switch and still receives').to.exist;
      const category = String(pick?.category);
      cy.gql(SET_MINE, { category }, { token: memberToken });
      cy.gql<{ me: { user_id: string } }>(ME, {}, { token: memberToken }).then(({ me }) => {
        asRole('CITY_ADMIN', (token) => {
          cy.gqlRaw(LOGS.query, { search: myMailPreferences.email }, { token }).then((body) => {
            expect(body.errors).to.be.undefined;
            const page = body.data?.mailPreferenceLogsTable as { rows: Array<Record<string, unknown>> };
            const [latest] = page.rows;
            expect(latest, 'the change just made, first').to.deep.include({ email: myMailPreferences.email, user_id: me.user_id, category, enabled: true });
            expect(SOURCES, 'where it was made').to.include(latest.source);
            page.rows.forEach((row, i) => {
              if (i > 0) expect(Date.parse(String(row.created_at)), 'newest first').to.be.at.most(Date.parse(String(page.rows[i - 1].created_at)));
            });
          });
          expectRead<Report>(token, ANALYTICS(1)).then((report) => {
            expect(report.range_days).to.equal(1);
            const row = report.by_category.find((c) => c.category === category);
            expect(row?.opt_ins, `${category} opt-ins today`).to.be.at.least(1);
            expect(report.opt_ins, 'opt-ins are the categories’ sum').to.equal(report.by_category.reduce((s, c) => s + c.opt_ins, 0));
            expect(report.opt_outs, 'opt-outs are the categories’ sum').to.equal(report.by_category.reduce((s, c) => s + c.opt_outs, 0));
            expect(report.people_opted_out_all, 'fully out is a subset of opted out').to.be.at.most(report.people_opted_out);
          });
        });
      });
    });
  });

  it('MMP-02 the report window defaults to 30 days and is capped at a year', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<Report>(token, ANALYTICS(0)).its('range_days').should('equal', 30);
      expectRead<Report>(token, ANALYTICS(1000)).its('range_days').should('equal', 365);
    });
  });

  it('MMP-03 a member and SUPPORT_USER cannot read the opt-out report or the change log', () => {
    const calls = [ANALYTICS(7), { ...LOGS, variables: { search: '' } }];
    expectCallsRefused(memberToken, calls);
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, calls));
  });
});
