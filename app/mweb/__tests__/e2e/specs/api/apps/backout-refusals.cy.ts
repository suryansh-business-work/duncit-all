/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember } from '../../../support/access-steps';
import { memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Backout & Refunds — what the server refuses before a seat, a refund or an
 * attempt is ever touched. Scenario map: Apps › Backout & Refunds ("Backout
 * closed once the pod starts", "Rejoin a backed-out pod for free", "Back out of
 * a paid single-seat booking" — the estimate a member reads first).
 *
 * podMember.service.ts backout loads the pod, refuses one that has already
 * taken place, then looks for the caller's JOINED booking ("You are not a
 * member of this pod") before it counts attempts or writes a BackoutRequest;
 * rejoin refuses a closed pod and then a caller with no backed-out booking.
 * The run account pays for nothing, so every PAID pod on staging is one it
 * holds no seat on: each call below is refused before any write, and no money
 * moves. Free pods are left out on purpose — backoutPod on a free pod cancels
 * the caller's spot, and the run account holds a free seat (06 Support).
 */

const PODS = `query E2eBackoutPods($filter: PodFilterInput) {
  pods(filter: $filter) { id pod_type pod_hosts_id pod_date_time is_hidden }
}`;
const BACKOUT = `mutation E2eBackoutPod($id: ID!) { backoutPod(pod_doc_id: $id) { id } }`;
const REJOIN = `mutation E2eRejoinPod($id: ID!) { rejoinPod(pod_doc_id: $id) { id } }`;
const STATE = `query E2eBackoutState($id: ID!) {
  podMembershipState(pod_doc_id: $id) {
    is_member status my_seats can_backout backout_in_process can_cancel_backout
    backout_attempts_used backout_attempts_max backout_deduction_pct can_cancel_spot
  }
}`;

interface PodRow {
  id: string;
  pod_type: 'FREE' | 'PAID';
  pod_hosts_id: string[];
  pod_date_time: string;
  is_hidden: boolean;
}

const POD_NOT_FOUND = refusal('NOT_FOUND', 'Pod not found');
const NOT_A_MEMBER = refusal('NOT_FOUND', 'You are not a member of this pod');
const BACKOUT_CLOSED = refusal('BAD_REQUEST', 'This pod has already taken place — backout is closed.');
/** rejoin checks completion before the start time, so a past pod answers with whichever applies. */
const REJOIN_CLOSED = [
  'This pod is already complete — rejoin is closed.',
  'This pod has already taken place — rejoin is closed.',
];

describe('API · Backout and rejoin refuse a pod the member holds no seat on', { testIsolation: false }, () => {
  let token = '';
  let upcoming: PodRow;
  let past: PodRow;

  before(() => {
    signInRunMember().then((member) => {
      token = member;
      memberId(member).then((ownId) => {
        cy.gql<{ pods: PodRow[] }>(PODS, { filter: { is_active: true } }, { token: member }).then(({ pods }) => {
          const paid = pods.filter((p) => p.pod_type === 'PAID' && !p.is_hidden && !p.pod_hosts_id.includes(ownId));
          const hourAhead = Date.now() + 3_600_000;
          const nextPaid = paid.find((p) => new Date(p.pod_date_time).getTime() > hourAhead);
          const pastPaid = paid.find((p) => new Date(p.pod_date_time).getTime() < Date.now());
          if (!nextPaid || !pastPaid) {
            throw new Error('Staging prerequisite: a listed PAID pod that is still to come and one that has taken place.');
          }
          upcoming = nextPaid;
          past = pastPaid;
        });
      });
    });
  });

  it('BO-01 a signed-out caller can neither back out nor rejoin', () => {
    cy.gqlRaw(BACKOUT, { id: upcoming.id }, { token: null }).then((body) => expectRefused('backoutPod', body, AUTH_REQUIRED));
    cy.gqlRaw(REJOIN, { id: upcoming.id }, { token: null }).then((body) => expectRefused('rejoinPod', body, AUTH_REQUIRED));
  });

  it('BO-02 a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(BACKOUT, { id: NO_ID }, { token }).then((body) => expectRefused('backoutPod', body, POD_NOT_FOUND));
    cy.gqlRaw(REJOIN, { id: NO_ID }, { token }).then((body) => expectRefused('rejoinPod', body, POD_NOT_FOUND));
  });

  it('BO-03 on an upcoming paid pod the member has no seat, so no backout is offered and none is accepted', () => {
    cy.gql<{ podMembershipState: Record<string, unknown> }>(STATE, { id: upcoming.id }, { token }).then(({ podMembershipState: s }) => {
      expect(s).to.deep.include({
        is_member: false,
        status: null,
        my_seats: 0,
        can_backout: false,
        backout_in_process: false,
        can_cancel_backout: false,
        backout_attempts_used: 0,
        can_cancel_spot: false,
      });
      expect(s.backout_attempts_max, 'Pod Settings allow at least one attempt').to.be.a('number').and.to.be.at.least(1);
      expect(s.backout_deduction_pct, 'the deduction is a percentage').to.be.within(0, 100);
    });
    cy.gqlRaw(BACKOUT, { id: upcoming.id }, { token }).then((body) => expectRefused('backoutPod', body, NOT_A_MEMBER));
    cy.gql<{ podMembershipState: { backout_attempts_used: number } }>(STATE, { id: upcoming.id }, { token })
      .its('podMembershipState.backout_attempts_used')
      .should('eq', 0);
  });

  it('BO-04 rejoining needs a backed-out booking of the member’s own', () => {
    cy.gqlRaw(REJOIN, { id: upcoming.id }, { token }).then((body) =>
      expectRefused('rejoinPod', body, refusal('NOT_FOUND', 'You have no backed-out booking for this pod')),
    );
  });

  it('BO-05 once a pod has taken place, backout and rejoin are both closed', () => {
    cy.gqlRaw(BACKOUT, { id: past.id }, { token }).then((body) => expectRefused('backoutPod', body, BACKOUT_CLOSED));
    cy.gqlRaw(REJOIN, { id: past.id }, { token }).then((body) => {
      const [error] = body.errors ?? [];
      expect(error, 'rejoinPod must answer with an error').to.exist;
      expect(error.extensions?.code).to.equal('BAD_REQUEST');
      expect(REJOIN_CLOSED).to.include(error.message);
      expect(body.data?.rejoinPod ?? null).to.be.null;
    });
  });
});
