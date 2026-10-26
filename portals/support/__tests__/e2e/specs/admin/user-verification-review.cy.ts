import { searchTable, tableRow } from '../../support/tables';
import { adminRun, openRunUser, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, wideViewport } from '../../support/ui-staff';

/**
 * Admin › User Verification Review: the Verification tab of a member's details
 * page (UserVerificationsSection over `userVerificationsTable`, one row per
 * type — IDENTITY, ADDRESS, EMAIL — keyed by the type).
 *
 * Read for the run account, which mWeb never asked to upload a document. No
 * verdict is given: approving or rejecting needs a document the member filed
 * for review, and the run account has none.
 */

const TABLE = 'admin-user-verifications';
const VERIFICATIONS = 'AdminUserVerificationsTable';

interface Verification {
  type: 'IDENTITY' | 'ADDRESS' | 'EMAIL';
  status: string;
}

const LOOKUP = `query E2eAdminUserVerifications($user_id: ID!, $query: TableQueryInput) {
  userVerificationsTable(user_id: $user_id, query: $query) { total rows { type status } }
}`;

/** VerificationCells TYPE_LABELS / STATUS_LABEL. */
const TYPE_LABEL: Readonly<Record<Verification['type'], string>> = { IDENTITY: 'Identity', ADDRESS: 'Address', EMAIL: 'Email' };
const STATUS_LABEL: Readonly<Record<string, string>> = {
  NOT_SUBMITTED: 'Not Verified',
  PENDING: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  VERIFIED_BY_APP: 'Verified by the App',
};

function lookup(run: AdminRun, search = ''): Cypress.Chainable<{ total: number; rows: Verification[] }> {
  return cy
    .gql<{ userVerificationsTable: { total: number; rows: Verification[] } }>(LOOKUP, {
      user_id: run.profile.user_id,
      query: { search, page: 1, page_size: 10 },
    })
    .its('userVerificationsTable');
}

function openTab(run: AdminRun): void {
  wideViewport();
  cy.interceptOperation(VERIFICATIONS);
  openRunUser(run, 'verification');
  cy.wait(`@${VERIFICATIONS}`);
}

describe('Admin · User Verification Review (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('UVR-01 one row per verification type, each with the status the server holds; search narrows, a miss reads "No verifications yet."', () => {
    lookup(run).then(({ rows }) => {
      expect(rows.map((r) => r.type), 'one row per type').to.have.members(['IDENTITY', 'ADDRESS', 'EMAIL']);
      openTab(run);
      for (const row of rows) tableRow(TABLE, row.type, [TYPE_LABEL[row.type], STATUS_LABEL[row.status] ?? row.status]);
    });

    lookup(run, 'EMAIL').then(({ rows }) => {
      searchTable(VERIFICATIONS, 'EMAIL');
      cy.byTestIdPrefix(`${TABLE}-row-`).should('have.length', rows.length);
      for (const row of rows) tableRow(TABLE, row.type, [TYPE_LABEL[row.type]]);
    });

    openTab(run);
    searchTable(VERIFICATIONS, specMarker(run.account, 'admin-verification-none'));
    expectTableEmpty('No verifications yet.');
  });

  it('UVR-02 the Email row is the app’s to verify: it reads "No review needed" and offers no verdict', () => {
    const reviews = countOperation('AdminReviewVerification');
    lookup(run).then(({ rows }) => {
      const email = rows.find((r) => r.type === 'EMAIL');
      expect(email, 'the EMAIL row').to.exist;
      openTab(run);
      tableRow(TABLE, 'EMAIL', [STATUS_LABEL[String(email?.status)], 'No review needed']);
      cy.byTestId(`${TABLE}-row-EMAIL`).find('[data-testid="verification-reject-reason"]').should('not.exist');
    });
    expectNotSent(reviews, 'AdminReviewVerification');
  });

  it('UVR-03 a never-submitted Identity row offers no Approve / Reject', () => {
    lookup(run).then(({ rows }) => {
      expect(rows.find((r) => r.type === 'IDENTITY')?.status, 'the run account never uploaded a document').to.eq('NOT_SUBMITTED');
      openTab(run);
      tableRow(TABLE, 'IDENTITY', ['Not Verified', 'No review needed']);
      cy.byTestId(`${TABLE}-row-IDENTITY`).find('[data-testid="verification-reject-reason"]').should('not.exist');
    });
  });
});
