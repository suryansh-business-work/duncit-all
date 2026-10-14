import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { expectTableEmpty, specMarker, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Change requests (/pods/change-requests): the Venue, Host and
 * Club Admin queues. Only browsing is automated — offering a replacement emails,
 * WhatsApps and notifies a real partner, and cancelling refunds real members.
 */

const QUEUE = 'PodChangeRequestsTable';

describe('Pods Portal · Change requests (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'pods-changes');
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('PCR-01 the queues switch by tab, kept in ?selectedtab=, each asking for its own role', () => {
    cy.interceptOperation(QUEUE);
    cy.visitPortal('pods', '/pods/change-requests');
    cy.byTestId('page-header-title').should('have.text', 'Change Requests');
    cy.wait(`@${QUEUE}`).then(({ request, response }) => {
      expect(request.body.variables.role, 'the Venue queue opens first').to.equal('VENUE');
      expect(response?.body.errors, 'ALL_PODS_ACCESS reads the queue').to.be.undefined;
    });
    cy.byTestId('change-requests-tab-venue').should('have.attr', 'aria-selected', 'true');

    cy.byTestId('change-requests-tab-host').click();
    cy.location('search').should('contain', 'selectedtab=host');
    cy.wait(`@${QUEUE}`).its('request.body.variables.role').should('eq', 'HOST');
    cy.byTestId('change-requests-tab-host').should('have.attr', 'aria-selected', 'true');

    cy.byTestId('change-requests-tab-club-admin').click();
    cy.location('search').should('contain', 'selectedtab=club-admin');
    cy.wait(`@${QUEUE}`).its('request.body.variables.role').should('eq', 'CLUB_ADMIN');

    cy.reload();
    cy.byTestId('change-requests-tab-club-admin').should('have.attr', 'aria-selected', 'true');
  });

  it('PCR-02 a search no request matches leaves the queue reading "No change requests in this queue."', () => {
    cy.interceptOperation(QUEUE);
    cy.visitPortal('pods', '/pods/change-requests?selectedtab=host');
    cy.wait(`@${QUEUE}`);
    searchTable(QUEUE, `${marker} no request says this`);
    expectTableEmpty('No change requests in this queue.');
  });
});
