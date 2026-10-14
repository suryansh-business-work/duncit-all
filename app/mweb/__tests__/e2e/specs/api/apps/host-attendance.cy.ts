/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignPod, memberId, refusal } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host - attendance — only the pod's host (or an admin of its club) reads the
 * roster, raises an attendance code or marks anybody present. Scenario map:
 * Apps › Host - attendance ("Attendee or other host cannot mark attendance").
 *
 * The board, the codes and the by-hand mark all start in attendance.service.ts
 * resolveViewer: the pod's host is let through, anyone else is asked to be an
 * admin of the pod's club (clubAdmin.service.ts assertClubAdminForPod), so a
 * plain member is refused with the club-admin answer before the host-only
 * checks are ever reached. The door scan uses the host gate itself
 * (ticket.service.ts hostScan → findHostedPod).
 *
 * The booking id is one no booking has, and the scanned token is not a ticket,
 * so even a broken gate could not text a number or mark anyone present.
 */

const NOT_CLUB_ADMIN = refusal('FORBIDDEN', 'You do not administer this club');

const BOARD = `query E2eAttendanceBoard($id: ID!) { podAttendanceBoard(pod_doc_id: $id) { pod_id } }`;
const HOST_MARK = `mutation E2eHostMark($id: ID!, $membership: ID!) {
  hostMarkPodAttendance(pod_doc_id: $id, membership_id: $membership) { pod_id }
}`;
const ATTENDANCE_OTP = `mutation E2eAttendanceOtp($input: PodAttendanceOtpInput!) {
  requestPodAttendanceOtp(input: $input) { __typename }
}`;
const SCAN = `mutation E2eHostScan($id: ID!, $token: String!) {
  hostScanPodTicket(pod_doc_id: $id, token: $token) { ok message }
}`;

describe("API · Only the pod's host marks attendance", { testIsolation: false }, () => {
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

  it('HA-01 the attendance board is refused signed out and to a member outside the pod', () => {
    cy.gqlRaw(BOARD, { id: podId }, { token: null }).then((body) =>
      expectRefused('podAttendanceBoard', body, SIGNED_OUT),
    );
    cy.gqlRaw(BOARD, { id: podId }, { token: memberToken }).then((body) =>
      expectRefused('podAttendanceBoard', body, NOT_CLUB_ADMIN),
    );
  });

  it('HA-02 a member cannot mark an attendee present by hand', () => {
    cy.gqlRaw(HOST_MARK, { id: podId, membership: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('hostMarkPodAttendance', body, NOT_CLUB_ADMIN),
    );
  });

  it("HA-03 a member cannot send an attendance code for someone else's pod", () => {
    const input = {
      pod_doc_id: podId,
      membership_id: NO_ID,
      name: 'E2E Attendee',
      phone_extension: '+91',
      phone_number: runAccount().phone,
      mediums: ['SMS'],
    };
    cy.gqlRaw(ATTENDANCE_OTP, { input }, { token: memberToken }).then((body) =>
      expectRefused('requestPodAttendanceOtp', body, NOT_CLUB_ADMIN),
    );
  });

  it("HA-04 a member cannot scan tickets at someone else's door", () => {
    cy.gqlRaw(SCAN, { id: podId, token: 'not-a-ticket' }, { token: memberToken }).then((body) =>
      expectRefused('hostScanPodTicket', body, refusal('FORBIDDEN', 'Only the pod host can manage this pod')),
    );
  });

  it('HA-05 the board of a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(BOARD, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('podAttendanceBoard', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });
});
