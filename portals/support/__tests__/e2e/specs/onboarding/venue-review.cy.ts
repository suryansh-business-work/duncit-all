import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, wideViewport, type OperationCount } from '../../support/ui-staff';
import { firstRow, onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Venue review: Onboarded Venues (/venues), the Review venue
 * dialog with its settings panels, and the venue page (/venues/:venueId,
 * Overview and Pods tabs, `?selectedtab=`).
 *
 * Every venue is a real partner's: no Approve / Reject, no deduction, request
 * limit or cancellation-trigger save. The trigger form is driven only to its
 * own Zod refusal, and every review write is counted as never sent.
 */

const TABLE = 'onboarding-venues';
const VENUES = 'VenuesTable';
const ZERO_ID = '000000000000000000000000';
const REVIEW_WRITES = [
  'ApproveVenue',
  'RejectVenue',
  'SetVenueDeductions',
  'SetVenueCancellationTrigger',
  'OnboardingVenueHostRequestLimit',
];

interface VenueRow {
  id: string;
  venue_name: string | null;
}

function openVenueReview(): Cypress.Chainable<VenueRow> {
  wideViewport();
  cy.interceptOperation(VENUES);
  cy.visitPortal('onboarding', '/venues');
  return firstRow<VenueRow>(VENUES, 'venuesTable', 'onboarded venue').then((venue) => {
    cy.byTestId(`${TABLE}-row-${venue.id}`).within(() => cy.byTestId(`venue-review-${venue.id}`).click());
    cy.byTestId('venue-review-dialog').should('contain.text', 'Review venue');
    return venue;
  });
}

const field = (testId: string) => cy.byTestId(testId).find('input');

describe('Onboarding · Venue review (run account, password CHANGED)', () => {
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

  it('OVR-01 Review venue names the venue, keeps Reject disabled until notes are typed, and Close sends nothing', () => {
    const writes: OperationCount[] = REVIEW_WRITES.map((name) => countOperation(name));
    openVenueReview().then((venue) => {
      cy.byTestId('venue-review-name').should('have.text', venue.venue_name || 'Venue');
      cy.byTestId('venue-review-reject').should('be.disabled');
      cy.byTestId('venue-review-notes').find('textarea').first().type('Photos are clear', { delay: 0 });
      cy.byTestId('venue-review-reject').should('be.enabled');
      cy.byTestId('venue-review-close').click();
      cy.byTestId('venue-review-dialog').should('not.exist');
    });
    REVIEW_WRITES.forEach((name, i) => expectNotSent(writes[i], name));
  });

  it('OVR-02 the cancellation trigger refuses negative hours and two refund bands on one window, and saves nothing', () => {
    const triggers = countOperation('SetVenueCancellationTrigger');
    openVenueReview().then(() => {
      field('cancellation-trigger-hours').clear().type('-1', { delay: 0 }).blur();
      cy.byTestId('cancellation-trigger-hours').should('contain.text', 'Hours cannot be negative.');

      cy.get('body').then(($body) => {
        const existing = $body.find('[data-testid^="refund-tier-"][data-testid$="-hours"]').length;
        cy.byTestId('cancellation-trigger-add-band').click();
        cy.byTestId('cancellation-trigger-add-band').click();
        for (const [offset, pct] of [
          [0, '50'],
          [1, '20'],
        ] as const) {
          field(`refund-tier-${existing + offset}-hours`).clear().type('24', { delay: 0 });
          field(`refund-tier-${existing + offset}-pct`).clear().type(pct, { delay: 0 });
        }
      });
      cy.byTestId('cancellation-trigger-save').click();
      cy.byTestId('venue-review-dialog').should('contain.text', 'Another band already uses this window.');
      cy.byTestId('cancellation-trigger-hours').find('input').should('have.attr', 'aria-invalid', 'true');
      cy.byTestId('venue-review-close').click();
    });
    expectNotSent(triggers, 'SetVenueCancellationTrigger');
  });

  it('OVR-03 the venue page opens on Overview, the Pods tab is its own link, and an unknown venue reads "Venue not found."', () => {
    wideViewport();
    cy.interceptOperation(VENUES);
    cy.visitPortal('onboarding', '/venues');
    firstRow<VenueRow>(VENUES, 'venuesTable', 'onboarded venue').then((venue) => {
      cy.visitPortal('onboarding', `/venues/${venue.id}`);
      cy.byTestId('back-header-title').should('have.text', venue.venue_name || 'Untitled venue');
      cy.byTestId('venue-details-tab-overview').should('have.attr', 'aria-selected', 'true');
      cy.byTestId('venue-details-tab-pods').click();
      cy.location('search').should('contain', 'selectedtab=pods');
      cy.byTestId('venue-details-tab-pods').should('have.attr', 'aria-selected', 'true');

      cy.interceptOperation('PodsTable');
      cy.visitPortal('onboarding', `/venues/${venue.id}?selectedtab=pods`);
      cy.byTestId('venue-details-tab-pods').should('have.attr', 'aria-selected', 'true');
      cy.wait('@PodsTable').its('response.body.errors').should('be.undefined');
    });
    cy.visitPortal('onboarding', `/venues/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Venue not found.');
  });
});
