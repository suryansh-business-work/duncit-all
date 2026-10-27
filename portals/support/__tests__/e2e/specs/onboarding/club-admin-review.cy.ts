import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, wideViewport, type OperationCount } from '../../support/ui-staff';
import { firstRow, onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Club admin review: Onboarded Club Admins (/club-admins) and the
 * Review Club Admin dialog (commission, Assign Clubs, review notes).
 *
 * Every profile is a real applicant's: no Approve / Reject, no commission or
 * club assignment save — the dialog is read, its notes rule checked, and every
 * review write counted as never sent.
 */

const TABLE = 'onboarding-club-admins';
const CLUB_ADMINS = 'ClubAdminProfilesTable';
const REVIEW_WRITES = ['ApproveClubAdmin', 'RejectClubAdmin', 'SetClubAdminCommission', 'AssignClubAdminClubs'];

interface ClubAdminRow {
  id: string;
  club_admin_no: string | null;
  full_name: string;
  reviewer_notes: string | null;
}

function openClubAdmins(): Cypress.Chainable<ClubAdminRow> {
  wideViewport();
  cy.interceptOperation(CLUB_ADMINS);
  cy.visitPortal('onboarding', '/club-admins');
  return firstRow<ClubAdminRow>(CLUB_ADMINS, 'clubAdminProfilesTable', 'onboarded club admin');
}

describe('Onboarding · Club admin review (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = onboardingAccount();
    marker = specMarker(account, 'onboarding-club-admins');
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OCA-01 the club admins table lists profiles with a Review action, and an unmatched search reads "No Club Admins onboarded yet."', () => {
    openClubAdmins().then((row) => {
      cy.byTestId(`${TABLE}-row-${row.id}`).should('contain.text', row.full_name);
      cy.byTestId(`${TABLE}-row-${row.id}`).within(() => cy.byTestId(`club-admin-review-${row.id}`).should('be.visible'));
    });
    searchTable(CLUB_ADMINS, `${marker} no such club admin`);
    expectTableEmpty('No Club Admins onboarded yet.');
  });

  it('OCA-02 Review Club Admin prefills the stored notes, loads the matching clubs, needs notes to Reject, and Close sends nothing', () => {
    const writes: OperationCount[] = REVIEW_WRITES.map((name) => countOperation(name));
    openClubAdmins().then((row) => {
      cy.interceptOperation('ClubAdminMatchingClubs');
      cy.byTestId(`${TABLE}-row-${row.id}`).within(() => cy.byTestId(`club-admin-review-${row.id}`).click());
      cy.byTestId('club-admin-review-dialog').should('contain.text', 'Review Club Admin');
      if (row.club_admin_no) cy.byTestId('club-admin-review-dialog').should('contain.text', row.club_admin_no);
      cy.wait('@ClubAdminMatchingClubs').its('response.body.errors').should('be.undefined');

      const notes = () => cy.byTestId('club-admin-review-notes').find('textarea').first();
      notes().should('have.value', row.reviewer_notes ?? '');
      notes().clear();
      cy.byTestId('club-admin-review-reject').should('be.disabled');
      notes().type('Club list confirmed', { delay: 0 });
      cy.byTestId('club-admin-review-reject').should('be.enabled');
      cy.byTestId('club-admin-review-close').click();
      cy.byTestId('club-admin-review-dialog').should('not.exist');
    });
    REVIEW_WRITES.forEach((name, i) => expectNotSent(writes[i], name));
  });
});
