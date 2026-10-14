/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue earnings — an owner's totals cover only their own venues, and a pod's
 * money breakdown is for its host, its venue's owner and admins. Scenario map:
 * Apps › Venue earnings ("Venue earnings before any payout"), Venue Earnings
 * ("Owner sees only own venues' earnings").
 *
 * breakdown.service.ts venueEarningsSummary answers zeros when the caller owns
 * no venue; podFinanceBreakdown (finance.resolver.ts) asks canViewPodBreakdown,
 * which is false alike for a pod that does not exist and for one the caller
 * neither hosts nor owns the venue of.
 */

const NO_BREAKDOWN = refusal('FORBIDDEN', 'Only this pod’s host, venue owner, or an admin can view its breakdown');

const SUMMARY = `query E2eVenueEarnings {
  myVenueEarningsSummary { lifetime_earnings pending_amount pods_completed this_month_earnings }
}`;
const PAYOUTS = `query E2eVenuePayouts { myVenuePayouts { __typename } }`;
const BREAKDOWN = `query E2ePodBreakdown($id: ID!) { podFinanceBreakdown(pod_id: $id) { pod_id } }`;

describe("API · Venue earnings are the owner's own", { testIsolation: false }, () => {
  let memberToken = '';
  let podId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignPod(token, id).then((pod) => {
          podId = pod.id;
        }),
      );
    });
  });

  it('VE-01 the earnings summary is refused signed out and reads zeros for someone who owns no venue', () => {
    cy.gqlRaw(SUMMARY, {}, { token: null }).then((body) => expectRefused('myVenueEarningsSummary', body, SIGNED_OUT));
    cy.gqlRaw(SUMMARY, {}, { token: memberToken }).then((body) =>
      expectAnswer('myVenueEarningsSummary', body, {
        lifetime_earnings: 0,
        pending_amount: 0,
        pods_completed: 0,
        this_month_earnings: 0,
      }),
    );
  });

  it('VE-02 the payout history of someone who owns no venue is empty', () => {
    cy.gqlRaw(PAYOUTS, {}, { token: null }).then((body) => expectRefused('myVenuePayouts', body, SIGNED_OUT));
    cy.gqlRaw(PAYOUTS, {}, { token: memberToken }).then((body) => expectAnswer('myVenuePayouts', body, []));
  });

  it("VE-03 another pod's money breakdown is refused, exactly as for a pod that does not exist", () => {
    cy.gqlRaw(BREAKDOWN, { id: podId }, { token: null }).then((body) =>
      expectRefused('podFinanceBreakdown', body, SIGNED_OUT),
    );
    cy.gqlRaw(BREAKDOWN, { id: podId }, { token: memberToken }).then((body) =>
      expectRefused('podFinanceBreakdown', body, NO_BREAKDOWN),
    );
    cy.gqlRaw(BREAKDOWN, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('podFinanceBreakdown', body, NO_BREAKDOWN),
    );
  });
});
