import { partnerWorld2, signInRunPartner } from '../../support/ui-partners-2';

/**
 * Partners › Change requests: ONE ChangeRequestsPage behind three routes, each
 * narrowing the shared ChangeRequestBoard (@duncit/pod-change-requests) to its
 * role — /host/change-requests (HOST), /club-admin/change-requests
 * (CLUB_ADMIN), /venues/change-requests (VENUE) — over one myPodChangeBoard
 * query.
 *
 * The run account has filed nothing and been offered nothing, so every board
 * is in its empty state — what this spec checks, against the server's own
 * answer. Filing a request is not done here: requestPodChange deducts Account
 * Health points and notifies Duncit's admins (podChangeRequest.service.ts
 * notifyAdmins), and every offer comes from a staff member.
 */

interface BoardRow {
  role: string;
}

const BOARDS = [
  { id: 'CR-01', path: '/host/change-requests', role: 'HOST', overline: 'Partner tools · Host' },
  { id: 'CR-02', path: '/club-admin/change-requests', role: 'CLUB_ADMIN', overline: 'Partner tools · Club Admin' },
  { id: 'CR-03', path: '/venues/change-requests', role: 'VENUE', overline: 'Partner tools · Venues' },
] as const;

describe('Partners UI · Change requests (the run partner’s three boards)', () => {
  before(() => {
    signInRunPartner();
    partnerWorld2();
  });

  beforeEach(() => {
    signInRunPartner();
  });

  BOARDS.forEach(({ id, path, role, overline }) => {
    it(`${id} ${path} shows the ${role} board: nothing waiting, nothing asked`, () => {
      cy.interceptOperation('MyPodChangeBoard');
      cy.visitApp(path);
      cy.wait('@MyPodChangeBoard').then(({ response }) => {
        const board = response?.body.data.myPodChangeBoard;
        const forRole = (rows: BoardRow[]) => rows.filter((row) => row.role === role);
        expect(forRole(board.incoming), `${role} offers waiting on the run`).to.deep.equal([]);
        expect(forRole(board.mine), `${role} requests the run filed`).to.deep.equal([]);
      });
      cy.location('pathname').should('eq', path);
      cy.byTestId('change-requests').should('be.visible');
      cy.byTestId('change-requests-title').should('not.exist');
      cy.byTestId('change-requests-incoming-title').should('have.text', 'Waiting on you');
      cy.byTestId('change-requests-incoming-empty').should('have.text', 'Nothing is waiting on you right now.');
      cy.byTestId('change-requests-mine-title').should('have.text', 'Your requests');
      cy.byTestId('change-requests-mine-empty').should('have.text', 'You have not asked Duncit to change anything.');
      cy.byTestId('change-requests').parent().should('contain.text', overline).and('contain.text', 'Change Requests');
    });
  });
});
