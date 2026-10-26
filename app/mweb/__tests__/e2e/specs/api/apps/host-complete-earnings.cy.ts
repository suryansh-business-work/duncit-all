/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host - complete & earnings — settling a pod is its host's alone, and a member
 * who has hosted nothing has earned nothing. Scenario map: Apps › Host -
 * complete & earnings ("Complete refused without attendance", "Host dashboard
 * and insights").
 *
 * Both money paths start with finance.resolver.ts assertPodActor, which loads
 * the pod and refuses anyone who is neither its host nor a pod admin with
 * "Only a host of this pod can do that" — before paymentRelease.service.ts
 * completePod (and its own "Only a host of this pod can complete it") runs.
 * Completion is only ever aimed at an id no pod has; the foreign pod is used
 * only with the read-only settlement preview.
 */

const NOT_HOST = refusal('FORBIDDEN', 'Only a host of this pod can do that');

const COMPLETE = `mutation E2eCompletePod($input: CompletePodInput!) { completePodSettlement(input: $input) { __typename } }`;
const PREVIEW = `query E2eSettlementPreview($id: ID!) {
  podSettlementPreview(pod_id: $id, venue_bill_amount: 0) { pod_id }
}`;
const EARNINGS = `query E2eHostEarnings {
  myHostEarningsSummary { lifetime_earnings pending_amount pods_completed this_month_earnings }
}`;
const PAYOUTS = `query E2eHostPayouts { myHostPayouts { __typename } }`;

describe('API · Settling a pod is its host’s, and a new member has earned nothing', { testIsolation: false }, () => {
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

  it('HE-01 completing a pod is refused signed out, and answers "Pod not found" for an id no pod has', () => {
    const input = { pod_id: NO_ID, venue_bill_amount: 0 };
    cy.gqlRaw(COMPLETE, { input }, { token: null }).then((body) =>
      expectRefused('completePodSettlement', body, SIGNED_OUT),
    );
    cy.gqlRaw(COMPLETE, { input }, { token: memberToken }).then((body) =>
      expectRefused('completePodSettlement', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });

  it("HE-02 a member cannot preview the settlement of someone else's pod", () => {
    cy.gqlRaw(PREVIEW, { id: podId }, { token: memberToken }).then((body) =>
      expectRefused('podSettlementPreview', body, NOT_HOST),
    );
  });

  it('HE-03 a member who never hosted reads zero earnings and no payouts', () => {
    cy.gqlRaw(EARNINGS, {}, { token: null }).then((body) =>
      expectRefused('myHostEarningsSummary', body, SIGNED_OUT),
    );
    cy.gqlRaw(EARNINGS, {}, { token: memberToken }).then((body) =>
      expectAnswer('myHostEarningsSummary', body, {
        lifetime_earnings: 0,
        pending_amount: 0,
        pods_completed: 0,
        this_month_earnings: 0,
      }),
    );
    cy.gqlRaw(PAYOUTS, {}, { token: memberToken }).then((body) => expectAnswer('myHostPayouts', body, []));
  });
});
