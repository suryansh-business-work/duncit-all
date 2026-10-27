/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Club admin studio — Club Admin is a membership of a club, not a role, so the
 * server checks the club on every call. Scenario map: Apps › Club admin studio
 * ("USER without CLUB_ADMIN on /clubs/* routes", "Club admin cannot manage
 * another club's pods").
 *
 * clubAdmin.service.ts: without a club the reads scope to the clubs the caller
 * administers (none for this member); naming a club, or reaching a pod through
 * its club, goes through assertClubAdmin, which answers a club that is not the
 * caller's exactly like one that does not exist. Deleting is only ever aimed at
 * an id no pod has.
 */

const NOT_CLUB_ADMIN = refusal('FORBIDDEN', 'You do not administer this club');

const MY_PODS = `query E2eMyClubPods($club: ID) { myClubPods(club_id: $club) { __typename } }`;
const SUMMARY = `query E2eMyClubPodsSummary { myClubPodsSummary { scope_count total } }`;
const DASHBOARD = `query E2eClubDashboard { clubAdminDashboard { clubs { __typename } } }`;
const PODS_TABLE = `query E2eClubPodsTable($club: ID) { clubAdminPodsTable(club_id: $club) { total } }`;
const POD_FOR_EDIT = `query E2eClubPodForEdit($id: ID!) { clubAdminPodForEdit(pod_doc_id: $id) { id } }`;
const ATTENDEES = `query E2eClubPodAttendees($id: ID!) { clubAdminPodAttendees(pod_doc_id: $id) { __typename } }`;
const UPDATE_CLUB = `mutation E2eClubUpdate($id: ID!) { clubAdminUpdateClub(club_doc_id: $id, input: {}) { __typename } }`;
const DELETE_POD = `mutation E2eClubDeletePod($id: ID!) { clubAdminDeletePod(pod_doc_id: $id) }`;

describe('API · Club Studio reaches only the clubs a member administers', { testIsolation: false }, () => {
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

  it('CA-01 a member who administers no club reads no club pods, figures or clubs', () => {
    cy.gqlRaw(MY_PODS, {}, { token: null }).then((body) => expectRefused('myClubPods', body, SIGNED_OUT));
    cy.gqlRaw(MY_PODS, {}, { token: memberToken }).then((body) => expectAnswer('myClubPods', body, []));
    cy.gqlRaw(SUMMARY, {}, { token: memberToken }).then((body) =>
      expectAnswer('myClubPodsSummary', body, { scope_count: 0, total: 0 }),
    );
    cy.gqlRaw(DASHBOARD, {}, { token: memberToken }).then((body) =>
      expectAnswer('clubAdminDashboard', body, { clubs: [] }),
    );
  });

  it('CA-02 naming a club the member does not administer is refused', () => {
    cy.gqlRaw(MY_PODS, { club: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('myClubPods', body, NOT_CLUB_ADMIN),
    );
    cy.gqlRaw(PODS_TABLE, { club: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('clubAdminPodsTable', body, NOT_CLUB_ADMIN),
    );
    cy.gqlRaw(UPDATE_CLUB, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('clubAdminUpdateClub', body, NOT_CLUB_ADMIN),
    );
  });

  it('CA-03 a pod in a club the member does not administer is not open to them', () => {
    cy.gqlRaw(POD_FOR_EDIT, { id: podId }, { token: memberToken }).then((body) =>
      expectRefused('clubAdminPodForEdit', body, NOT_CLUB_ADMIN),
    );
    cy.gqlRaw(ATTENDEES, { id: podId }, { token: memberToken }).then((body) =>
      expectRefused('clubAdminPodAttendees', body, NOT_CLUB_ADMIN),
    );
  });

  it('CA-04 deleting a pod as club admin answers "Pod not found" for an id no pod has', () => {
    cy.gqlRaw(DELETE_POD, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('clubAdminDeletePod', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });
});
