/// <reference types="cypress" />
import { ACCESS_DENIED, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Club Admin studio (/club-admin/*) — its dashboard, a pod's attendance
 * and the monitoring trail. Being a club admin is a membership of a club, not
 * a role, so the club-admin service checks it on every call
 * (clubs/clubAdmin/clubAdmin.service.ts `assertClubAdmin`: the club must list
 * the caller as an admin) — a missing club and someone else's answer alike.
 * Scenario map: Partners › Club admin dashboard, Attendance, Pod monitoring (AI).
 */

const DASHBOARD = `query E2eClubAdminDashboard { clubAdminDashboard { clubs { __typename } trend { __typename } } }`;
const CLUB_PODS = `query E2eMyClubPods($club_id: ID) { myClubPods(club_id: $club_id) { __typename } }`;
const ATTENDEES = `query E2eClubAdminAttendees($id: ID!) { clubAdminPodAttendees(pod_doc_id: $id) { __typename } }`;
const FORCE_ATTENDANCE = `mutation E2eForceAttendance($id: ID!, $membership: ID!) {
  clubAdminForceAttendance(pod_doc_id: $id, membership_id: $membership) { __typename }
}`;
const MONITORING = `query E2eClubAdminMonitoring { clubAdminPodAuditLogsTable(query: { page_size: 1 }) { total } }`;

const NOT_THEIR_CLUB: Refusal = { code: 'FORBIDDEN', message: 'You do not administer this club' };
const POD_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Pod not found' };

describe('API · The Club Admin studio answers only for clubs the caller administers', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('CS-01 the dashboard is refused signed out and lists no club for a member who runs none', () => {
    expectEachRefused('clubAdminDashboard', DASHBOARD, {}, [[null, SIGNED_OUT]]);
    cy.gqlRaw(DASHBOARD, {}, { token: memberToken }).then((body) => {
      expect(body.errors, 'clubAdminDashboard errors').to.be.undefined;
      expect(body.data?.clubAdminDashboard).to.deep.equal({ clubs: [], trend: [] });
    });
  });

  it('CS-02 the pods of a club the member does not run are refused', () => {
    expectEachRefused('myClubPods', CLUB_PODS, { club_id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_THEIR_CLUB],
    ]);
  });

  it('CS-03 a pod’s attendance cannot be read or marked by a member outside its club', () => {
    expectEachRefused('clubAdminPodAttendees', ATTENDEES, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, POD_NOT_FOUND],
    ]);
    expectEachRefused('clubAdminForceAttendance', FORCE_ATTENDANCE, { id: NO_ID, membership: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, POD_NOT_FOUND],
    ]);
  });

  it('CS-04 the club monitoring trail is refused to anyone who is not a club admin', () => {
    expectEachRefused('clubAdminPodAuditLogsTable', MONITORING, {}, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
    ]);
  });
});
