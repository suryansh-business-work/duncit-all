import type { Interception } from 'cypress/types/net-stubbing';
import {
  NO_SUCH_ID,
  TABLE_VIEWPORT,
  countOperation,
  expectNotSent,
  foreignClubId,
  openRow,
  partnerWorld2,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
} from '../../support/ui-partners-2';

/**
 * Partners › Club admin clubs: Your Clubs (/club-admin/clubs, myAdminClubsTable)
 * and Edit Club Details (/club-admin/clubs/:clubId/edit, the shared
 * @duncit/club-form editor with the governance sections hidden).
 *
 * The run's club was created by the fixture step with a name and a description
 * only, so the shared club schema (club-form schema.ts) refuses to save it as
 * it stands — which is how the validation rows are proven without writing.
 * Nothing in this spec saves a club. clubAdminUpdateClub is gated by
 * clubAdminService.assertClubAdmin ("You do not administer this club").
 */

const TABLE = 'partners-club-admin-clubs';
const CLUB_IDS = `query E2eUiP2AdminClubIds { myAdminClubs { id } }`;
const UPDATE_CLUB = `mutation E2eUiP2ForeignClubUpdate($id: ID!, $input: UpdateClubInput!) {
  clubAdminUpdateClub(club_doc_id: $id, input: $input) { id }
}`;

function openYourClubs(): Cypress.Chainable<Interception> {
  cy.viewport(...TABLE_VIEWPORT);
  cy.interceptOperation('MyAdminClubsTable');
  cy.visitApp('/club-admin/clubs');
  return cy.wait('@MyAdminClubsTable');
}

function openEditClub(world: PartnerWorld2): void {
  cy.interceptOperation('ClubForEdit');
  cy.visitApp(`/club-admin/clubs/${world.clubId}/edit`);
  cy.wait('@ClubForEdit');
  cy.byTestId('club-editor-heading').should('have.text', world.clubName);
}

describe('Partners UI · Club admin clubs (the run’s own club)', () => {
  let world: PartnerWorld2;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('CAC-01 Your Clubs lists the run’s club, and only clubs the run administers', () => {
    openYourClubs().then(({ response }) => {
      const rows: Array<{ id: string }> = response?.body.data.myAdminClubsTable.rows ?? [];
      cy.gql<{ myAdminClubs: Array<{ id: string }> }>(CLUB_IDS).then(({ myAdminClubs }) => {
        const mine = myAdminClubs.map((club) => club.id);
        expect(rows.map((row) => row.id), 'rows the table was given').to.include(world.clubId);
        rows.forEach((row) => expect(mine, `club ${row.id} is administered by the run`).to.include(row.id));
      });
    });
    cy.byTestId('clubs-hub').should('be.visible');
    tableRow(TABLE, world.clubId, [world.clubName]);
  });

  it('CAC-02 a row click and its Pods button both open the club’s pods page', () => {
    openYourClubs();
    openRow(TABLE, world.clubId, [world.clubName]);
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}`);
    cy.byTestId('club-pods-heading').should('have.text', world.clubName);

    openYourClubs();
    cy.byTestId(`club-admin-club-pods-${world.clubId}`).should('contain.text', 'Pods').click();
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}`);
    cy.byTestId('club-pods-heading').should('have.text', world.clubName);
  });

  it('CAC-03 Edit Club Details opens the club’s editor, and Back to pods leaves without saving', () => {
    const update = countOperation('ClubAdminUpdateClub');
    cy.interceptOperation('ClubAdminPodsTable');
    cy.visitApp(`/club-admin/clubs/${world.clubId}`);
    cy.wait('@ClubAdminPodsTable');
    cy.byTestId('club-pods-edit-club').should('contain.text', 'Edit Club Details').click();
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}/edit`);
    cy.byTestId('club-editor-heading').should('have.text', world.clubName);
    cy.byTestId('club-form').should('be.visible');
    cy.byTestId('club-editor-back').should('contain.text', 'Back to pods').click();
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}`);
    expectNotSent(update, 'ClubAdminUpdateClub');
  });

  it('CAC-04 saving the club as the fixture left it is refused by the shared club rules, and nothing is sent', () => {
    const update = countOperation('ClubAdminUpdateClub');
    openEditClub(world);
    cy.byTestId('club-form-save').should('be.enabled').click();
    cy.byTestId('club-form')
      .should('contain.text', 'Select a super category')
      .and('contain.text', 'Select a sub category')
      .and('contain.text', 'Select the club location')
      .and('contain.text', 'Add at least one "Who we are" point')
      .and('contain.text', 'Add at least one "What we do" point')
      .and('contain.text', 'Add at least one perk')
      .and('contain.text', 'Add at least one value');
    expectNotSent(update, 'ClubAdminUpdateClub');
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}/edit`);
  });

  it('CAC-05 a club the run does not administer cannot be written, and an unknown club shows Club not found.', () => {
    foreignClubId(world).then((foreign) => {
      // An empty input: even a guard that let it through would change nothing.
      cy.gqlError(UPDATE_CLUB, { id: foreign, input: {} }).should('eq', 'You do not administer this club');
    });
    cy.visitApp(`/club-admin/clubs/${NO_SUCH_ID}/edit`);
    cy.byTestId('query-guard-not-found').should('be.visible').and('have.text', 'Club not found.');
    cy.byTestId('club-form').should('not.exist');
  });
});
