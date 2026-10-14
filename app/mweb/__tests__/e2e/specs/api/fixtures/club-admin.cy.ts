/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { expectAnswer, foreignPod, refusal } from '../../../support/api-apps';
import { ensureFreePod, signInRunPartner, type FixtureWorld } from '../../../support/fixture-world';

/**
 * Club Studio, as the admin of the run's own club. Scenario map: Apps › Club
 * admin studio ("Club admin cannot manage another club's pods") — here from the
 * side of somebody who IS a club admin, so the refusal is not just the answer
 * every member gets.
 *
 * clubAdmin.service.ts scopedClubIds narrows every read to the clubs whose
 * admin_user_ids hold the caller; naming one of them is allowed, naming any
 * other club, or opening a pod of another club, is refused by
 * assertClubAdmin(ForPod) exactly as for a member. Only reads are made.
 */

const NOT_CLUB_ADMIN = refusal('FORBIDDEN', 'You do not administer this club');

const MY_PODS = `query E2eFixtureClubPods($club: ID) { myClubPods(club_id: $club) { id } }`;
const SUMMARY = `query E2eFixtureClubSummary($club: ID) { myClubPodsSummary(club_id: $club) { scope_count total upcoming } }`;
const POD_FOR_EDIT = `query E2eFixtureClubPodEdit($id: ID!) { clubAdminPodForEdit(pod_doc_id: $id) { id club_id } }`;
const POD_CLUB = `query E2eFixtureForeignClub($id: ID!) { pod(pod_doc_id: $id) { club_id } }`;
const PODS_TABLE =`query E2eFixtureClubPodsTable($club: ID) { clubAdminPodsTable(club_id: $club) { total } }`;

interface Summary {
  scope_count: number;
  total: number;
  upcoming: number;
}

describe('API · Club Studio: the run administers its own club and still reaches no other', { testIsolation: false }, () => {
  let token = '';
  let world: FixtureWorld;

  before(() => {
    signInRunPartner().then((partner) => {
      ensureFreePod(partner).then((built) => {
        world = built;
      });
    });
    signInRunPartner().then((partner) => {
      token = partner;
    });
  });

  it('CAF-01 the club’s pods and figures include the run’s free pod', () => {
    cy.gql<{ myClubPods: Array<{ id: string }> }>(MY_PODS, { club: world.club.id }, { token }).then(({ myClubPods }) => {
      expect(myClubPods.map((pod) => pod.id), 'club pods').to.include(world.pod.id);
    });
    cy.gql<{ myClubPodsSummary: Summary }>(SUMMARY, { club: world.club.id }, { token }).then(({ myClubPodsSummary }) => {
      expect(myClubPodsSummary.scope_count, 'clubs in scope').to.equal(1);
      expect(myClubPodsSummary.total, 'pods in the club').to.be.at.least(1);
      expect(myClubPodsSummary.upcoming, 'upcoming pods').to.be.at.least(1);
    });
    cy.gql<{ clubAdminPodsTable: { total: number } }>(PODS_TABLE, { club: world.club.id }, { token }).then(
      ({ clubAdminPodsTable }) => {
        expect(clubAdminPodsTable.total, 'club pods table').to.be.at.least(1);
      },
    );
  });

  it('CAF-02 the club admin opens its club’s pod for editing', () => {
    cy.gqlRaw(POD_FOR_EDIT, { id: world.pod.id }, { token }).then((body) =>
      expectAnswer('clubAdminPodForEdit', body, { id: world.pod.id, club_id: world.club.id }),
    );
  });

  it('CAF-03 a pod of another club is refused to the club admin as to anyone', () => {
    foreignPod(token, world.userId).then((pod) => {
      cy.gqlRaw(POD_FOR_EDIT, { id: pod.id }, { token }).then((body) =>
        expectRefused('clubAdminPodForEdit', body, NOT_CLUB_ADMIN),
      );
    });
  });

  it('CAF-04 naming a club the run does not administer is refused', () => {
    foreignPod(token, world.userId).then((pod) => {
      cy.gql<{ pod: { club_id: string } }>(POD_CLUB, { id: pod.id }, { token }).then(({ pod: foreign }) => {
        cy.gqlRaw(MY_PODS, { club: foreign.club_id }, { token }).then((body) =>
          expectRefused('myClubPods', body, NOT_CLUB_ADMIN),
        );
        cy.gqlRaw(SUMMARY, { club: foreign.club_id }, { token }).then((body) =>
          expectRefused('myClubPodsSummary', body, NOT_CLUB_ADMIN),
        );
      });
    });
  });
});
