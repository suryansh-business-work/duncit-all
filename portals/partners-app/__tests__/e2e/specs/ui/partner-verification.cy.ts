/// <reference types="cypress" />
import {
  countOperation,
  expectNotSent,
  partnerWorld,
  signInRunPartner,
  visitAndWait,
} from '../../support/ui-partners-3';

/**
 * Partner verification, live (scenario map › Partners › Partner verification).
 *
 * /verification (src/pages/verification-page/VerificationPage.tsx) renders
 * @duncit/verification's cards over `myVerifications`, in the server's order:
 * Identity (one image or PDF, at most 4 MB), Address and Email (verified by
 * the app). Nothing is submitted here — the document over the limit is refused
 * on the page before anything is uploaded — so the run account's rows are
 * unchanged for every spec after this one.
 */

type Status = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFIED_BY_APP';

/** STATUS_META in @duncit/verification, as packages/i18n bundles/verification.ts words it. */
const STATUS_LABEL: Record<Status, string> = {
  NOT_SUBMITTED: 'Not Verified',
  PENDING: 'Under review',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
  VERIFIED_BY_APP: 'Verified by the App',
};

const MY_VERIFICATIONS = `query E2eUiP3Verifications { myVerifications { type status } }`;

/** A PDF one byte over the 4 MB cap (@duncit/verification documents.ts). */
const OVERSIZED_PDF = {
  contents: Cypress.Buffer.alloc(4 * 1024 * 1024 + 1),
  fileName: 'e2e-partner-verification-oversized.pdf',
  mimeType: 'application/pdf',
};

describe('Partners · Partner verification (the run’s partner account)', () => {
  let rows: Array<{ type: string; status: Status }> = [];

  before(() => {
    signInRunPartner();
    partnerWorld();
    cy.gql<{ myVerifications: typeof rows }>(MY_VERIFICATIONS).then(({ myVerifications }) => {
      rows = myVerifications;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('PV-01 shows Identity, Address and Email in the server’s order, each with its status, and the Email note', () => {
    visitAndWait('/verification', 'MyVerifications');
    cy.byTestId('verification-page').should('be.visible');
    cy.byTestId('verification-cards-list')
      .children()
      .should((cards) => {
        const order = [...cards].map((card) => card.dataset.testid);
        expect(order, 'card order').to.deep.equal(rows.map((row) => `verification-${row.type}`));
      });
    rows.forEach((row) => {
      cy.byTestId(`verification-status-${row.type}`).should('have.text', STATUS_LABEL[row.status]);
    });
    cy.byTestId('verification-EMAIL').within(() => {
      cy.byTestId('verification-email-note').should(
        'have.text',
        'Your email is verified when you sign in — no action needed here.',
      );
      cy.byTestId('verification-upload-button').should('not.exist');
    });
  });

  it('PV-02 an identity document over 4 MB is refused before anything is uploaded, and the status is unchanged', () => {
    const identity = rows.find((row) => row.type === 'IDENTITY');
    if (!identity) throw new Error('myVerifications has no IDENTITY row.');
    if (identity.status === 'PENDING' || identity.status === 'APPROVED') {
      throw new Error(`The run account's IDENTITY verification is ${identity.status}, so it offers no upload.`);
    }
    visitAndWait('/verification', 'MyVerifications');
    const submits = countOperation('SubmitVerification');
    cy.byTestId('verification-upload-button').should('be.enabled');
    cy.byTestId('verification-file-input').selectFile(OVERSIZED_PDF, { force: true });
    cy.byTestId('verification-page-snack').should('have.text', 'Please upload a document under 4 MB.');
    cy.byTestId('verification-status-IDENTITY').should('have.text', STATUS_LABEL[identity.status]);
    expectNotSent(submits, 'SubmitVerification');
  });
});
