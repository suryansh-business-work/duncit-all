/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * The Ads console (ads.duncit.com, portal key `ads`, sign-in role ADS_MANAGER):
 * the advertiser's dashboard, My Ads (myAdRequestsTable), one request
 * (adRequest) and Create Ad (submitAdRequest) — ads/ads.resolver.ts. Lists and
 * the dashboard are ADS_SUBMIT (SUPER_ADMIN, ADS_MANAGER); a submission is
 * ADS_SUBMIT_ANY, which also admits a brand's ECOMM_MANAGER; one request is
 * its submitter's or Marketing's.
 *
 * A real submission is priced, queued for Marketing and mailed out, and only
 * Marketing (a role a run account cannot hold) can delete it — so no request
 * is ever created. Every submission below breaks one rule `validateSubmission`
 * checks before anything is written (ads.service.ts submit), and the run
 * account's own request count is proven still zero afterwards.
 *
 * Scenario map: Ads Portal › Dashboard, My Ads, Create Ad, Ad request details.
 */

const ROLES: readonly E2eStaffRole[] = ['ADS_MANAGER', 'ECOMM_MANAGER'];

const MY_ADS = call(
  'myAdRequestsTable',
  `query E2eMyAds { myAdRequestsTable(query: { page_size: 5 }) { total page_size rows { id } } }`,
);
const MY_DASHBOARD = call(
  'myAdsDashboard',
  `query E2eMyAdsHome { myAdsDashboard { total pending approved live rejected expired total_approved_cost live_spend next_start_at } }`,
);
const RATE_CARD = `query E2eAdRateCard { publicAdRateCard { min_days max_days currency_symbol entries { position price_per_day } } }`;
const SUBMIT = `mutation E2eSubmitAd($input: SubmitAdRequestInput!) { submitAdRequest(input: $input) { id trace_id } }`;
const ONE_AD = `query E2eOneAd($id: ID!) { adRequest(id: $id) { id } }`;

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Ad request not found' };

const today = (): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

/** A request every rule accepts — each scenario breaks exactly one of them. */
const validAd = (overrides: Record<string, unknown> = {}) => ({
  ad_title: 'E2E refused ad',
  ad_description: 'An ad request the server refuses before saving',
  ad_type: 'IMAGE',
  media_url: 'https://duncit.com/duncit-logo.svg',
  position: 'HOME_BOTTOM',
  start_at: today(),
  duration_days: 7,
  redirect_url: 'https://duncit.com',
  ...overrides,
});

function expectSubmitRefused(token: string, input: Record<string, unknown>, refusal: Refusal): void {
  cy.gqlRaw(SUBMIT, { input }, { token }).then((body) => expectRefused('submitAdRequest', body, refusal));
}

describe('API · The Ads console: an advertiser’s own requests, and a submission refused before it is saved', { testIsolation: false }, () => {
  let memberToken = '';
  let dayWindow = { min: 1, max: 30 };

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    cy.gql<{ publicAdRateCard: { min_days: number; max_days: number } }>(RATE_CARD, {}, { token: null }).then(
      ({ publicAdRateCard }) => {
        dayWindow = { min: publicAdRateCard.min_days, max: publicAdRateCard.max_days };
      },
    );
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('ADP-01 a member cannot sign in to the Ads console, list ads or submit one; signed out is not authenticated', () => {
    expectPortalRefused('ads');
    expectCallsRefused(memberToken, [MY_ADS, MY_DASHBOARD]);
    cy.gqlRaw(SUBMIT, { input: validAd() }, { token: memberToken }).then((body) =>
      expectRefused('submitAdRequest', body, ACCESS_DENIED),
    );
    cy.gqlRaw(SUBMIT, { input: validAd() }, { token: null }).then((body) => expectRefused('submitAdRequest', body, SIGNED_OUT));
    cy.gqlRaw(ONE_AD, { id: NO_ID }, { token: null }).then((body) => expectRefused('adRequest', body, SIGNED_OUT));
  });

  it('ADP-02 the rate card the Create Ad estimate reads is public, with a day window and a price for every placement', () => {
    cy.gql<{ publicAdRateCard: { min_days: number; max_days: number; entries: Array<{ position: string; price_per_day: number }> } }>(
      RATE_CARD,
      {},
      { token: null },
    ).then(({ publicAdRateCard }) => {
      expect(publicAdRateCard.min_days, 'shortest campaign').to.be.at.least(1);
      expect(publicAdRateCard.max_days, 'longest campaign').to.be.at.least(publicAdRateCard.min_days);
      const positions = publicAdRateCard.entries.map((entry) => entry.position);
      expect(positions, 'every placement is priced').to.include.members(['AUTO', 'HOME_BOTTOM', 'POD_DETAILS']);
      publicAdRateCard.entries.forEach((entry) => expect(entry.price_per_day, entry.position).to.be.at.least(0));
    });
  });

  it('ADP-03 ADS_MANAGER signs in and sees an empty My Ads and a zeroed dashboard for an account that never submitted', () => {
    asRole('ADS_MANAGER', (token) => {
      expectPortalOpens('ads');
      expectRead<{ total: number; rows: unknown[] }>(token, MY_ADS).then((page) => {
        expect(page.total, 'requests this account submitted').to.equal(0);
        expect(page.rows, 'My Ads rows').to.be.empty;
      });
      expectRead<Record<string, number | string | null>>(token, MY_DASHBOARD).then((dashboard) => {
        ['total', 'pending', 'approved', 'live', 'rejected', 'expired', 'total_approved_cost', 'live_spend'].forEach((kpi) =>
          expect(dashboard[kpi], kpi).to.equal(0),
        );
        expect(dashboard.next_start_at, 'no ad is due to go live').to.be.null;
      });
    });
  });

  it('ADP-04 a request id nobody has, or that is not an id, reads "Ad request not found"', () => {
    asRole('ADS_MANAGER', (token) => {
      cy.gqlRaw(ONE_AD, { id: NO_ID }, { token }).then((body) => expectRefused('adRequest', body, NOT_FOUND));
      cy.gqlRaw(ONE_AD, { id: 'not-an-id' }, { token }).then((body) => expectRefused('adRequest', body, NOT_FOUND));
    });
  });

  it('ADP-05 a submission breaking one rule is refused with that rule, and nothing reaches My Ads', () => {
    asRole('ADS_MANAGER', (token) => {
      expectSubmitRefused(token, validAd({ media_url: 'ftp://example.com/ad.png' }), bad('Ad media must be uploaded before submitting'));
      expectSubmitRefused(token, validAd({ media_url: '' }), bad('Ad media must be uploaded before submitting'));
      expectSubmitRefused(token, validAd({ redirect_url: 'ftp://example.com' }), bad('Redirect URL must start with http(s)://'));
      cy.then(() => {
        const rule = bad(`Duration must be between ${dayWindow.min} and ${dayWindow.max} days`);
        expectSubmitRefused(token, validAd({ duration_days: dayWindow.max + 1 }), rule);
        expectSubmitRefused(token, validAd({ duration_days: dayWindow.min - 1 }), rule);
      });
      const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expectSubmitRefused(token, validAd({ start_at: yesterday }), bad('Start date cannot be in the past'));
      expectSubmitRefused(token, validAd({ start_at: 'not a date' }), bad('Invalid start date'));
      expectRead<{ total: number }>(token, MY_ADS).then((page) => expect(page.total, 'nothing was saved').to.equal(0));
    });
  });

  it('ADP-06 a brand’s ECOMM_MANAGER passes the submit gate but not the advertiser’s lists or sign-in', () => {
    asRole('ECOMM_MANAGER', (token) => {
      expectPortalRefused('ads');
      expectCallsRefused(token, [MY_ADS, MY_DASHBOARD]);
      // Past the role gate, the first rule answers: proof the gate admitted it, with nothing saved.
      expectSubmitRefused(token, validAd({ media_url: 'not-a-link' }), bad('Ad media must be uploaded before submitting'));
    });
  });
});
