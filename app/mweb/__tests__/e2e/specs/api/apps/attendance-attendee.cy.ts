/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Attendance & Visited, the attendee's side — the virtual meeting link that
 * marks a member present. Scenario map: Apps › Attendance & Visited - Attendee
 * View ("Join a virtual pod meeting").
 *
 * attendance.service.ts joinMeeting refuses a malformed id, a missing pod and a
 * pod that is not virtual, then hands the link only to the pod's host or a
 * member holding a JOINED booking; anyone else gets "Join this pod to get the
 * meeting link" and nothing is recorded. The Pod resolver hides meeting_url
 * from the same people (canViewMeeting), so the link never leaks through the
 * pod read either. The pods used are ones the run account holds no booking on
 * — checked through podMembershipState before each is used.
 */

const PODS = `query E2eAttendancePods($filter: PodFilterInput) {
  pods(filter: $filter) { id pod_mode pod_hosts_id is_hidden }
}`;
const STATE = `query E2eAttendanceState($id: ID!) { podMembershipState(pod_doc_id: $id) { is_member status } }`;
const MEETING_FIELDS = `query E2eAttendanceMeeting($id: ID!) { pod(pod_doc_id: $id) { id pod_mode meeting_url } }`;
const JOIN = `mutation E2eJoinPodMeeting($id: ID!) {
  joinPodMeeting(pod_doc_id: $id) { meeting_url attendance_marked }
}`;

interface PodRow {
  id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  pod_hosts_id: string[];
  is_hidden: boolean;
}

/** The first of `pods` the caller holds no booking of any kind on. */
function firstNotBooked(token: string, pods: PodRow[], what: string): Cypress.Chainable<PodRow> {
  const [pod, ...rest] = pods;
  if (!pod) throw new Error(`Staging prerequisite: a listed ${what} pod the run account has not booked.`);
  return cy
    .gql<{ podMembershipState: { is_member: boolean; status: string | null } }>(STATE, { id: pod.id }, { token })
    .then(({ podMembershipState }) =>
      podMembershipState.status === null ? cy.wrap(pod, { log: false }) : firstNotBooked(token, rest, what),
    );
}

describe('API · A virtual pod’s meeting link is for its members, and opening it is how they are marked present', { testIsolation: false }, () => {
  let token = '';
  let physical: PodRow;
  let virtual: PodRow;

  before(() => {
    signInRunMember().then((member) => {
      token = member;
      memberId(member).then((ownId) => {
        cy.gql<{ pods: PodRow[] }>(PODS, { filter: { is_active: true } }, { token: member }).then(({ pods }) => {
          const foreign = pods.filter((p) => !p.is_hidden && !p.pod_hosts_id.includes(ownId));
          firstNotBooked(member, foreign.filter((p) => p.pod_mode === 'PHYSICAL'), 'physical').then((pod) => {
            physical = pod;
          });
          firstNotBooked(member, foreign.filter((p) => p.pod_mode === 'VIRTUAL'), 'virtual').then((pod) => {
            virtual = pod;
          });
        });
      });
    });
  });

  it('AT-01 opening a meeting needs a signed-in caller', () => {
    cy.gqlRaw(JOIN, { id: virtual.id }, { token: null }).then((body) => expectRefused('joinPodMeeting', body, SIGNED_OUT));
  });

  it('AT-02 a malformed id and a pod that does not exist are refused', () => {
    cy.gqlRaw(JOIN, { id: 'not-a-pod' }, { token }).then((body) =>
      expectRefused('joinPodMeeting', body, refusal('BAD_USER_INPUT', 'Invalid pod id')),
    );
    cy.gqlRaw(JOIN, { id: NO_ID }, { token }).then((body) =>
      expectRefused('joinPodMeeting', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });

  it('AT-03 a pod held at a place has no meeting to open — attendance there is the door scan', () => {
    cy.gqlRaw(JOIN, { id: physical.id }, { token }).then((body) =>
      expectRefused('joinPodMeeting', body, refusal('BAD_USER_INPUT', 'This pod is not virtual')),
    );
  });

  it('AT-04 a member without a booking neither reads nor opens a virtual pod’s link, and is not marked present', () => {
    cy.gql<{ pod: { pod_mode: string; meeting_url: string | null } }>(MEETING_FIELDS, { id: virtual.id }, { token }).then(({ pod }) => {
      expect(pod.pod_mode).to.equal('VIRTUAL');
      expect(pod.meeting_url, 'the link is hidden from a non-member').to.be.null;
    });
    cy.gqlRaw(JOIN, { id: virtual.id }, { token }).then((body) => {
      const [error] = body.errors ?? [];
      expect(error, 'joinPodMeeting must answer with an error').to.exist;
      // A host who has not set the link yet is refused before membership is checked.
      const refusals = [
        { code: 'FORBIDDEN', message: 'Join this pod to get the meeting link' },
        { code: 'BAD_USER_INPUT', message: 'This pod has no meeting link yet' },
      ];
      expect(refusals).to.deep.include({ code: error.extensions?.code, message: error.message });
      expect(body.data?.joinPodMeeting ?? null, 'no link and no attendance').to.be.null;
    });
    cy.gql<{ podMembershipState: { is_member: boolean; status: string | null } }>(STATE, { id: virtual.id }, { token })
      .its('podMembershipState')
      .should('deep.equal', { is_member: false, status: null });
  });
});
