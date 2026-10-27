/// <reference types="cypress" />
import { podPhase } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import { openFromMenu } from '../../../support/menu-steps';

/**
 * Bookings & tickets (/pod-history), live on staging, on the free seat the run
 * account took in 06 (Support) — its one JOINED booking with no payment behind
 * it, so the ticket exists and the invoice does not.
 */

const MEMBERSHIPS_QUERY = `query E2eMyBookings {
  myPodMemberships { id status payment_id pod { id pod_id club_slug pod_title pod_date_time pod_end_date_time } }
}`;

/** Base64 of "%PDF-". */
const PDF_MAGIC_BASE64 = 'JVBERi0';

interface Booking {
  id: string;
  status: string;
  payment_id: string | null;
  pod: {
    id: string;
    pod_id: string;
    club_slug: string;
    pod_title: string;
    pod_date_time: string;
    pod_end_date_time: string | null;
  } | null;
}

function openBooking(id: string): void {
  cy.interceptOperation('MyPodMembershipsForHistory');
  cy.visitApp(`/pod-history/${id}`);
  cy.wait('@MyPodMembershipsForHistory');
  cy.byTestId('pod-history-details-page').should('be.visible');
}

describe('UI Bookings & tickets', () => {
  let booking: Booking & { pod: NonNullable<Booking['pod']> };

  before(() => {
    signInRunMember();
    cy.gql<{ myPodMemberships: Booking[] }>(MEMBERSHIPS_QUERY).then((data) => {
      const found = data.myPodMemberships.find(
        (row) => row.status === 'JOINED' && !row.payment_id && row.pod && podPhase(row.pod.pod_date_time, row.pod.pod_end_date_time) === 'UPCOMING',
      );
      if (!found?.pod) throw new Error('The run account has no upcoming free JOINED booking — 06 joins a free pod.');
      booking = { ...found, pod: found.pod };
    });
  });

  it('BK-01 Pod History, from the menu, lists the booking with its join date and opens it', () => {
    cy.interceptOperation('MyPodMembershipsForHistory');
    openFromMenu('sidebar-grid-pod-history', '/pod-history');
    cy.wait('@MyPodMembershipsForHistory');
    cy.byTestId('pod-history-page').should('be.visible');
    cy.byTestId(`pod-history-card-${booking.id}`)
      .should('contain.text', booking.pod.pod_title)
      .and('contain.text', 'Joined')
      .click();
    cy.location('pathname').should('eq', `/pod-history/${booking.id}`);
  });

  it('BK-02 the booking shows its pod, a Joined chip, the timeline, and only the actions a free seat has', () => {
    openBooking(booking.id);
    cy.byTestId('ph-summary-title').should('have.text', booking.pod.pod_title);
    cy.byTestId('ph-status-chip').should('have.text', 'Joined');
    cy.byTestId('ph-timeline-header-title').should('be.visible');
    cy.byTestId('ph-pod-details').should('have.attr', 'href', `/club/${booking.pod.club_slug}/pod/${booking.pod.pod_id}`);
    cy.byTestId('ph-invoice').should('be.disabled');
    cy.byTestId('ph-ticket').should('be.enabled');
    cy.byTestId('ph-support').should('have.attr', 'href').and('match', /^\/support\/tickets\?/);
  });

  it('BK-03 Ticket & invoice downloads the booking’s ticket PDF', () => {
    openBooking(booking.id);
    cy.interceptOperation('PodHistoryTicketForPod');
    cy.interceptOperation('PodHistoryTicketPdf');
    cy.byTestId('ph-ticket').should('have.text', 'Ticket & invoice').click();
    cy.wait('@PodHistoryTicketForPod').its('response.body.data.myEventTicketForPod.id').should('be.a', 'string');
    cy.wait('@PodHistoryTicketPdf')
      .its('response.body.data.eventTicketPdfBase64')
      .should('be.a', 'string')
      .and('match', new RegExp(`^${PDF_MAGIC_BASE64}`));
    cy.byTestId('notify-host-alert').should('not.exist');
  });
});
