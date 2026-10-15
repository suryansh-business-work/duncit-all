import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { countOperation, expectNotSent, wideViewport, type OperationCount } from '../../support/ui-staff';
import { firstRow, onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Host review: Onboarded Hosts (/hosts), the Review host dialog
 * and the host page (/hosts/:hostId).
 *
 * Every host is a real applicant. The Review dialog saves categories and the
 * commission the moment they change and the request limit on its own button,
 * so the spec never touches those, never clicks Approve / Reject, and proves
 * none of the review writes went out. The run account owns no host at this
 * step (the mweb_fixtures step builds it later).
 */

const TABLE = 'onboarding-hosts';
const HOSTS = 'HostsTable';
const ZERO_ID = '000000000000000000000000';
const REVIEW_WRITES = ['ApproveHost', 'RejectHost', 'SetHostDeductions', 'OnboardingSetHostCategories', 'OnboardingHostVenueRequestLimit'];

interface HostRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

/** Onboarded Hosts, wide, and the first host it lists. */
function openHosts(): Cypress.Chainable<HostRow> {
  wideViewport();
  cy.interceptOperation(HOSTS);
  cy.visitPortal('onboarding', '/hosts');
  return firstRow<HostRow>(HOSTS, 'hostsTable', 'onboarded host');
}

describe('Onboarding · Host review (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = onboardingAccount();
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OHV-01 the hosts table searches by email, and the details icon opens the host page', () => {
    openHosts().then((host) => {
      if (host.email) {
        searchTable(HOSTS, host.email);
        cy.byTestId(`${TABLE}-row-${host.id}`).should('contain.text', host.email);
      }
      cy.byTestId(`${TABLE}-row-${host.id}`).within(() => cy.byTestId(`host-view-${host.id}`).click());
      cy.location('pathname').should('eq', `/hosts/${host.id}`);
      cy.byTestId('back-header-title').should('have.text', host.full_name || 'Unnamed host');
    });
  });

  it('OHV-02 Review host shows the applicant, keeps Reject disabled until notes are typed, and Close sends nothing', () => {
    const writes: OperationCount[] = REVIEW_WRITES.map((name) => countOperation(name));
    openHosts().then((host) => {
      cy.byTestId(`${TABLE}-row-${host.id}`).within(() => cy.byTestId(`host-review-${host.id}`).click());
      cy.byTestId('host-review-dialog').should('contain.text', 'Review host');
      cy.byTestId('host-review-name').should('have.text', host.full_name || 'Host');
      cy.byTestId('host-review-reject').should('be.disabled');
      cy.byTestId('host-review-notes').find('textarea').first().type('Documents look complete', { delay: 0 });
      cy.byTestId('host-review-reject').should('be.enabled');
      cy.byTestId('host-review-close').click();
      cy.byTestId('host-review-dialog').should('not.exist');
    });
    REVIEW_WRITES.forEach((name, i) => expectNotSent(writes[i], name));
  });

  it('OHV-03 the monthly Pod Request limit refuses a value over its maximum before anything is saved', () => {
    const limits = countOperation('OnboardingHostVenueRequestLimit');
    openHosts().then((host) => {
      cy.byTestId(`${TABLE}-row-${host.id}`).within(() => cy.byTestId(`host-review-${host.id}`).click());
      cy.byTestId('host-request-limit-input').invoke('attr', 'max').then((max) => {
        cy.byTestId('host-request-limit-input').clear().type(String(Number(max) + 1), { delay: 0 });
      });
      cy.byTestId('host-request-limit-input').should('have.attr', 'aria-invalid', 'true');
      cy.byTestId('host-review-close').click();
    });
    expectNotSent(limits, 'OnboardingHostVenueRequestLimit');
  });

  it('OHV-04 the host page lists the host’s pods, and an unknown host reads "Host not found."', () => {
    openHosts().then((host) => {
      cy.interceptOperation('PodsTable');
      cy.visitPortal('onboarding', `/hosts/${host.id}`);
      cy.wait('@PodsTable').then(({ request, response }) => {
        expect(response?.body.errors).to.be.undefined;
        expect(request.body.variables.query.filters).to.deep.include({ field: 'host_user_id', op: 'eq', value: host.user_id });
      });
    });
    cy.visitPortal('onboarding', `/hosts/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Host not found.');
  });
});
