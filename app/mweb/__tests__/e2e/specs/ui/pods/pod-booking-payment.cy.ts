/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { joinableFreePod, loadWorld, openPodPage, useCity, type WorldPod } from '../../../support/ui-apps-1';

/**
 * Pod booking, live on staging — only what takes no money. A free pod is joined
 * from its booking bar (no gateway is involved), and the seat is handed back
 * through the API in `after`, so the pod's capacity is as it was found; the
 * checkout with nothing to pay for is read without paying.
 */

const MEMBERSHIPS_QUERY = `query E2eMyMemberships { myPodMemberships { id status pod { id } } }`;
const CANCEL_SPOT_MUTATION = `mutation E2eCancelFreeSpot($id: ID!) { cancelFreeSpot(pod_doc_id: $id) { id status } }`;

type Membership = { id: string; status: string; pod: { id: string } | null };

describe('UI Pod booking & payment', () => {
  let pod: WorldPod;
  let joined = false;

  before(() => {
    signInRunMember();
    loadWorld().then((world) => {
      pod = joinableFreePod(world);
      useCity(String(pod.location_id));
    });
  });

  after(() => {
    if (joined) cy.gql(CANCEL_SPOT_MUTATION, { id: pod.id });
  });

  it('BP-01 a free pod is joined straight from the booking bar, with no payment, and shows in Pod History', () => {
    openPodPage(pod);
    cy.byTestId('pod-action-panel').should('be.visible');
    cy.interceptOperation('JoinFreePod');
    cy.byTestId('pod-book').should('have.text', 'Join').click();
    cy.wait('@JoinFreePod')
      .its('response.body.data.joinFreePod.status')
      .then((status) => {
        joined = true;
        expect(status, 'membership status').to.equal('JOINED');
      });
    cy.byTestId('pod-details-snack').should('contain.text', 'Joined!');
    cy.byTestId('member-panel').should('be.visible');
    cy.byTestId('pod-book').should('not.exist');
    cy.location('pathname').should('not.contain', '/checkout');
    cy.gql<{ myPodMemberships: Membership[] }>(MEMBERSHIPS_QUERY).then((data) => {
      const membership = data.myPodMemberships.find((row) => row.pod?.id === pod.id && row.status === 'JOINED');
      expect(membership, 'the new booking').to.exist;
      cy.interceptOperation('MyPodMembershipsForHistory');
      cy.visitApp('/pod-history');
      cy.wait('@MyPodMembershipsForHistory');
      cy.byTestId(`pod-history-card-${membership?.id}`).should('contain.text', pod.pod_title).and('contain.text', 'Joined');
    });
  });

  it('BP-02 the checkout with no pod and no amount says there is nothing to pay, and leads Home', () => {
    cy.visitApp('/checkout');
    cy.byTestId('checkout-unavailable').should('contain.text', 'Nothing to checkout');
    cy.byTestId('checkout-unavailable-home').should('have.text', 'Back to Home').click();
    cy.location('pathname').should('eq', '/');
  });
});
