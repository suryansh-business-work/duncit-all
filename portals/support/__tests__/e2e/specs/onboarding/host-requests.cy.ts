import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable } from '../../support/tables';
import {
  countOperation,
  expectConfirm,
  expectNotSent,
  expectTableEmpty,
  specMarker,
  wideViewport,
} from '../../support/ui-staff';
import { onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Host requests (/host-requests): approved hosts asking to host
 * in another category. Every request is a real host's, so the spec reads the
 * queue, opens each status's Action menu and the Reject / Delete confirmations,
 * and closes them unsent — Acknowledge itself is a status write and is never
 * clicked.
 */

const TABLE = 'onboarding-host-requests';
const REQUESTS = 'HostRequestsTable';

interface HostRequestRow {
  id: string;
  request_no: string;
  status: string;
}

const REQUESTS_LOOKUP = `query E2eOnboardingHostRequests($query: TableQueryInput) {
  hostRequestsTable(query: $query) { rows { id request_no status } }
}`;

function findRequest(statuses: string[], why: string): Cypress.Chainable<HostRequestRow> {
  return cy
    .gql<{ hostRequestsTable: { rows: HostRequestRow[] } }>(REQUESTS_LOOKUP, {
      query: { page: 1, page_size: 20, filters: [{ field: 'status', op: 'in', values: statuses }] },
    })
    .then(({ hostRequestsTable }) => {
      const row = hostRequestsTable.rows.find((r) => !!r.request_no);
      if (!row) throw new Error(`Staging holds no host additional-category request that is ${why}.`);
      return row;
    });
}

/** The queue, wide, searched down to one request, with its Action menu open. */
function openRequestMenu(row: HostRequestRow): void {
  wideViewport();
  openTable('onboarding', '/host-requests', REQUESTS);
  searchTable(REQUESTS, row.request_no);
  cy.byTestId(`${TABLE}-row-${row.id}`).within(() => cy.byTestId(`host-request-actions-${row.id}`).click());
}

describe('Onboarding · Host requests (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = onboardingAccount();
    marker = specMarker(account, 'onboarding-host-requests');
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OHR-01 the queue loads, and a search matching nothing reads "No host requests found."', () => {
    cy.interceptOperation(REQUESTS);
    cy.visitPortal('onboarding', '/host-requests');
    cy.wait(`@${REQUESTS}`).its('response.body.errors').should('be.undefined');
    searchTable(REQUESTS, `${marker} no such request`);
    expectTableEmpty('No host requests found.');
  });

  it('OHR-02 a requested request offers Acknowledge and Delete only', () => {
    findRequest(['REQUESTED'], 'still requested').then((row) => {
      openRequestMenu(row);
      cy.byTestId('host-request-action-acknowledge').should('be.visible');
      cy.byTestId('host-request-action-delete').should('be.visible');
      cy.byTestId('host-request-action-approve').should('not.exist');
      cy.get('body').type('{esc}');
    });
  });

  it('OHR-03 an acknowledged request offers Approve and Reject, and Reject stays disabled until a reason is typed', () => {
    findRequest(['ACKNOWLEDGED'], 'acknowledged').then((row) => {
      const rejects = countOperation('RejectHostRequest');
      openRequestMenu(row);
      cy.byTestId('host-request-action-approve').should('be.visible');
      cy.byTestId('host-request-action-reject').click();
      cy.byTestId('host-request-decision').should('contain.text', 'Reject host request').and('contain.text', row.request_no);
      cy.byTestId('host-request-decision-confirm').should('be.disabled');
      cy.byTestId('host-request-decision-notes').find('textarea').first().type('   ', { delay: 0 });
      cy.byTestId('host-request-decision-confirm').should('be.disabled');
      cy.byTestId('host-request-decision-notes').find('textarea').first().clear().type('Category is full', { delay: 0 });
      cy.byTestId('host-request-decision-confirm').should('be.enabled');
      cy.byTestId('host-request-decision-cancel').click();
      cy.byTestId('host-request-decision').should('not.exist');
      expectNotSent(rejects, 'RejectHostRequest');
    });
  });

  it('OHR-04 a decided request offers only Delete, whose confirmation is cancelled', () => {
    findRequest(['APPROVED', 'REJECTED'], 'already decided').then((row) => {
      const deletes = countOperation('DeleteHostRequest');
      openRequestMenu(row);
      cy.byTestId('host-request-action-acknowledge').should('not.exist');
      cy.byTestId('host-request-action-approve').should('not.exist');
      cy.byTestId('host-request-action-reject').should('not.exist');
      cy.byTestId('host-request-action-delete').click();
      expectConfirm('Delete host request');
      cy.byTestId('confirm-dialog-message').should('contain.text', row.request_no);
      cy.byTestId('confirm-dialog-cancel').click();
      cy.byTestId('confirm-dialog').should('not.exist');
      cy.byTestId(`${TABLE}-row-${row.id}`).should('exist');
      expectNotSent(deletes, 'DeleteHostRequest');
    });
  });
});
