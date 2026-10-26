/// <reference types="cypress" />
import { openFromMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Verification, live (scenario map › Verification).
 *
 * /verification renders @duncit/verification's cards over `myVerifications`:
 * Identity (one document, at most 4 MB), Address (a manual form) and Email
 * (verified by the app). A row under review or approved is locked; any other
 * row takes a submission. The checks here stop before anything is sent — an
 * address with its required fields empty and a document over the size limit
 * are both refused on the page — so the run account's rows are unchanged.
 */

type Status = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFIED_BY_APP';

/** STATUS_META in @duncit/verification, as the verification bundle words it. */
const STATUS_LABEL: Record<Status, string> = {
  NOT_SUBMITTED: 'Not Verified',
  PENDING: 'Under review',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
  VERIFIED_BY_APP: 'Verified by the App',
};

const MY_VERIFICATIONS = `query E2eUi3Verifications { myVerifications { type status } }`;

/** A PDF one byte over 4 MB. */
const OVERSIZED_PDF = {
  contents: Cypress.Buffer.alloc(4 * 1024 * 1024 + 1),
  fileName: 'e2e-verification-oversized.pdf',
  mimeType: 'application/pdf',
};

describe('Verification', () => {
  const account = runAccount();
  const statuses: Partial<Record<string, Status>> = {};

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.gql<{ myVerifications: Array<{ type: string; status: Status }> }>(MY_VERIFICATIONS).then(({ myVerifications }) => {
      myVerifications.forEach((row) => {
        statuses[row.type] = row.status;
      });
      ['IDENTITY', 'ADDRESS'].forEach((type) => {
        const status = statuses[type];
        if (status === 'PENDING' || status === 'APPROVED') {
          throw new Error(`The run account's ${type} verification is ${status}, so its form is locked.`);
        }
      });
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('VE-01 menu › Verification shows Identity, Address and Email with each one’s status', () => {
    cy.interceptOperation('MyVerifications');
    openFromMenu('sidebar-item-Verification', '/verification');
    cy.wait('@MyVerifications');
    cy.byTestId('verification-page').should('be.visible');
    (['IDENTITY', 'ADDRESS', 'EMAIL'] as const).forEach((type) => {
      const status = statuses[type];
      if (!status) throw new Error(`myVerifications has no ${type} row.`);
      cy.byTestId(`verification-status-${type}`).should('have.text', STATUS_LABEL[status]);
    });
  });

  it('VE-02 Submit address with the required fields empty is refused on the page', () => {
    visitAndWait('/verification', 'MyVerifications');
    ['line1', 'city', 'state', 'pincode'].forEach((field) =>
      cy.byTestId(`verification-address-${field}-input`).clear(),
    );
    cy.byTestId('verification-submit-address').should('have.text', 'Submit address').click();
    cy.byTestId('verification-page-snack').should('have.text', 'Address line, city, state and pincode are required.');
    cy.byTestId('verification-status-ADDRESS').should('have.text', STATUS_LABEL[statuses.ADDRESS as Status]);
  });

  it('VE-03 an identity document over 4 MB is refused before anything is uploaded', () => {
    visitAndWait('/verification', 'MyVerifications');
    cy.byTestId('verification-upload-button').should('be.enabled');
    cy.byTestId('verification-file-input').selectFile(OVERSIZED_PDF, { force: true });
    cy.byTestId('verification-page-snack').should('have.text', 'Please upload a document under 4 MB.');
    cy.byTestId('verification-status-IDENTITY').should('have.text', STATUS_LABEL[statuses.IDENTITY as Status]);
  });

  it('VE-04 the Email row is the app’s own check and offers no upload or form', () => {
    visitAndWait('/verification', 'MyVerifications');
    cy.byTestId('verification-EMAIL').within(() => {
      cy.byTestId('verification-email-note').should(
        'have.text',
        'Your email is verified when you sign in — no action needed here.',
      );
      cy.byTestId('verification-upload-button').should('not.exist');
      cy.byTestId('verification-submit-address').should('not.exist');
    });
  });
});
