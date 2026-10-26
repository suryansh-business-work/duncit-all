/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import {
  declineTracking,
  isUpcomingLinkable,
  listedPods,
  mePlace,
  podPath,
  setHeaderCity,
  visitAndWait,
  type ListedPod,
} from '../../../support/ui-apps-3';

/**
 * Free physical pods — a member's side, live (scenario map › Free physical
 * pods, the member row).
 *
 * On a FREE pod the booking bar's button reads "Join" and joins at once
 * (`joinFreePod`) — no checkout and no payment. A joined member leaves through
 * "Cancel Spot" (`cancelFreeSpot`, behind a confirm), which frees the seat, and
 * can join and cancel again with no backout limit (usePodDetailActions.ts,
 * MemberPanel.tsx, CancelSpotDialog.tsx). The pod is read from the listed pods
 * first: free, physical, starting more than two hours from now, with a seat
 * left, and not one the run account already holds. The seat is the run
 * account's own and is given back before the spec ends; its header city is set
 * to the pod's so the page opens without the "different location" dialog.
 */

const TWO_HOURS = 2 * 60 * 60 * 1000;
const CANCEL_SPOT = `mutation E2eUi3CancelSpot($id: ID!) { cancelFreeSpot(pod_doc_id: $id) { id } }`;

/** Free, physical, far enough ahead, with a seat (0 spots is unlimited), and not the member's already. */
const isJoinable = (row: ListedPod, userId: string): boolean =>
  row.pod_type === 'FREE' &&
  row.pod_mode === 'PHYSICAL' &&
  isUpcomingLinkable(row, TWO_HOURS) &&
  (row.no_of_spots === 0 || (row.seats_available ?? 0) > 0) &&
  !row.pod_attendees.includes(userId) &&
  !row.pod_hosts_id.includes(userId);

describe('Free physical pods', { testIsolation: false }, () => {
  const account = runAccount();
  let originalCity: string | null = null;
  let userId = '';
  let pod: ListedPod;

  const openPod = () => visitAndWait(podPath(pod), 'PodDetails');

  const join = () => {
    cy.interceptOperation('JoinFreePod');
    cy.byTestId('pod-book').should('have.text', 'Join').and('be.enabled').click();
    cy.wait('@JoinFreePod');
    cy.byTestId('pod-details-snack').should('contain.text', 'Joined!');
    cy.byTestId('member-panel').should('be.visible');
    cy.byTestId('pod-booked-label').should('have.text', 'Pod Booked');
    cy.location('pathname').should('eq', podPath(pod));
  };

  const cancelSpot = () => {
    cy.byTestId('pod-cancel-spot').should('have.text', 'Cancel Spot').click();
    cy.byTestId('cancel-spot-dialog').should('be.visible');
    cy.interceptOperation('CancelFreeSpot');
    cy.byTestId('cancel-spot-confirm').should('have.text', 'Cancel My Spot').click();
    cy.wait('@CancelFreeSpot');
    cy.byTestId('pod-details-snack').should(
      'contain.text',
      'Your spot is cancelled. You can join again any time while the pod is open.',
    );
    cy.byTestId('member-panel').should('not.exist');
    cy.byTestId('pod-book').should('have.text', 'Join');
  };

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    declineTracking();
    mePlace().then((me) => {
      originalCity = me.selected_location_id;
      userId = me.user_id;
    });
    listedPods().then((pods) => {
      const found = pods.find((row) => isJoinable(row, userId));
      if (!found) {
        throw new Error(
          'Staging prerequisite: a live FREE physical pod starting more than two hours from now, with a seat the run account does not hold.',
        );
      }
      pod = found;
      setHeaderCity(found.location_id);
    });
  });

  after(() => {
    // The seat is the run account's own: give it back if a scenario stopped while holding it.
    cy.gqlRaw(CANCEL_SPOT, { id: pod.id });
    setHeaderCity(originalCity);
  });

  it('FP-01 Join on a free pod joins at once — no checkout, no payment', () => {
    openPod();
    cy.byTestId('pod-action-panel').should('be.visible');
    join();
  });

  it('FP-02 Cancel Spot asks first; Keep Spot keeps the seat', () => {
    cy.byTestId('pod-cancel-spot').click();
    cy.byTestId('cancel-spot-dialog').should('be.visible');
    cy.byTestId('cancel-spot-keep').should('have.text', 'Keep Spot').click();
    cy.byTestId('cancel-spot-dialog').should('not.exist');
    cy.byTestId('member-panel').should('be.visible');
  });

  it('FP-03 confirming frees the seat and the pod can be joined again', () => {
    cancelSpot();
  });

  it('FP-04 join and cancel repeat with no backout limit', () => {
    openPod();
    join();
    cancelSpot();
    join();
    cancelSpot();
  });
});
