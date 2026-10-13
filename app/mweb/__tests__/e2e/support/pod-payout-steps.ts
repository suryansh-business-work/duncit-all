/// <reference types="cypress" />
import { sendCode } from './account-steps';
import { attachThroughPicker, runPhoto } from './support-steps';
import { SLOT_PRICE, SPACE_LABEL, TICKET_PRICE, type Actor, type PayoutWorld } from './pod-payout-world';

/**
 * The screens of the pod payout journey, as each person walks them: the host's
 * Create Pod stepper (`create-pod-stepper`, one `create-pod-submit` for Next and
 * for Create Pod), the venue owner's slot requests, a guest's checkout, the
 * host's attendance board and Complete Pod dialog, Finance's Payment Release
 * and the wallet. What a screen cannot say — who is who, what a payout came to —
 * is read from the API with the reader's own token.
 */

const POD_QUERY = `query E2ePayoutPod($id: ID!) {
  pod(pod_doc_id: $id) { id is_active venue_approval_status completed_at }
}`;

const SHORTEN_POD_MUTATION = `mutation E2ePayoutShortenPod($id: ID!, $end: String!) {
  updatePod(pod_doc_id: $id, input: { pod_end_date_time: $end }) { id pod_end_date_time }
}`;

const FINANCE_QUERY = `query E2ePayoutPodFinance($id: ID!) {
  podFinanceBreakdown(pod_id: $id) { bookings_count collected_total settlement_status waterfall { host_receives } }
}`;

const TICKET_QUERY = `query E2ePayoutTicket($id: ID!) {
  myEventTicketForPod(pod_doc_id: $id) { qr_token }
}`;

const BOARD_QUERY = `query E2ePayoutBoard($id: ID!) {
  podAttendanceBoard(pod_doc_id: $id) { rows { membership_id user_id attended marked_method } }
}`;

const HOST_PAYOUTS_QUERY = `query E2ePayoutHostPayouts {
  myHostPayouts { id pod_id batch_id status }
}`;

const RELEASE_QUERY = `query E2ePayoutRelease($id: ID!) {
  podPaymentRelease(id: $id) {
    summary { id status total_requested has_bill release_count }
    releases { kind status amount_requested approved_amount beneficiary_email bill_url }
  }
}`;

const VENUE_COMMISSION_QUERY = `query E2ePayoutVenueCommission {
  financeSettings { default_venue_commission_pct }
}`;

const WALLET_QUERY =`query E2ePayoutWallet {
  myWallet { balance }
  myWalletTransactions { id type amount source pod_id }
}`;

/** What the venue's final bill adds on top of the slot price, in rupees. */
export const VENUE_BILL = 150;

export type ReleaseKind = 'HOST_PAYMENT' | 'VENUE_BILLING' | 'CLUB_ADMIN';

export interface PodState {
  is_active: boolean | null;
  venue_approval_status: string;
  completed_at: string | null;
}

export interface PodFinance {
  bookings_count: number;
  collected_total: number;
  settlement_status: string;
  waterfall: { host_receives: number };
}

export interface BoardRow {
  membership_id: string;
  user_id: string;
  attended: boolean;
  marked_method: string | null;
}

export interface ReleaseRow {
  kind: string;
  status: string;
  amount_requested: number;
  approved_amount: number | null;
  beneficiary_email: string;
  bill_url: string | null;
}

export interface ReleaseDetail {
  summary: { id: string; status: string; total_requested: number; has_bill: boolean; release_count: number };
  releases: ReleaseRow[];
}

export interface WalletState {
  myWallet: { balance: number };
  myWalletTransactions: Array<{ id: string; type: string; amount: number; source: string; pod_id: string | null }>;
}

const financeUrl = (path: string): string => `${String(Cypress.env('FINANCE_URL'))}${path}`;

/**
 * Answer the cookie banner when the page shows it. It sits over the bottom of
 * the screen, where every one of these pages keeps its main button.
 */
function answerConsent(): void {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="consent-reject-all"]').length > 0) cy.byTestId('consent-reject-all').click();
  });
  cy.byTestId('consent-banner').should('not.exist');
}

const nextStep = () => cy.byTestId('create-pod-submit').should('be.enabled').click();

export const podState = (podId: string, token: string) =>
  cy.gql<{ pod: PodState }>(POD_QUERY, { id: podId }, { token }).then((data) => data.pod);

/**
 * Staff bring the pod's end forward, as they can from the Pods console. A host
 * cannot schedule less than half an hour, and Complete Pod only opens once a
 * pod is over — this is what keeps the run from lasting that long.
 */
export const shortenPod = (podId: string, endAt: string, token: string) =>
  cy
    .gql<{ updatePod: { pod_end_date_time: string } }>(SHORTEN_POD_MUTATION, { id: podId, end: endAt }, { token })
    .then((data) => data.updatePod.pod_end_date_time);

export const podFinance = (podId: string, token: string) =>
  cy.gql<{ podFinanceBreakdown: PodFinance }>(FINANCE_QUERY, { id: podId }, { token }).then((data) => data.podFinanceBreakdown);

/** The signed-in guest's ticket code — what the host's scanner reads off their phone. */
export const myTicketCode = (podId: string) =>
  cy.gql<{ myEventTicketForPod: { qr_token: string } | null }>(TICKET_QUERY, { id: podId }).then((data) => {
    const code = data.myEventTicketForPod?.qr_token;
    if (!code) throw new Error('The paid booking issued no ticket.');
    return code;
  });

/** The signed-in host's roster for the pod. */
export const attendanceRows = (podId: string) =>
  cy.gql<{ podAttendanceBoard: { rows: BoardRow[] } }>(BOARD_QUERY, { id: podId }).then((data) => data.podAttendanceBoard.rows);

/** The request the signed-in host's completion filed for the pod: its payouts share one batch. */
export const hostRequestId = (podId: string) =>
  cy
    .gql<{ myHostPayouts: Array<{ pod_id: string | null; batch_id: string | null; status: string }> }>(HOST_PAYOUTS_QUERY)
    .then((data) => {
      const payout = data.myHostPayouts.find((row) => row.pod_id === podId);
      if (!payout?.batch_id) throw new Error('Completing the pod filed no host payout for Finance to approve.');
      return payout.batch_id;
    });

export const releaseDetail = (requestId: string, token: string) =>
  cy.gql<{ podPaymentRelease: ReleaseDetail }>(RELEASE_QUERY, { id: requestId }, { token }).then((data) => data.podPaymentRelease);

/** Duncit's commission on a venue's payout. The run's venue sets none of its own, so the default is its rate. */
export const venueCommissionPct = (token: string) =>
  cy
    .gql<{ financeSettings: { default_venue_commission_pct: number } }>(VENUE_COMMISSION_QUERY, {}, { token })
    .then((data) => data.financeSettings.default_venue_commission_pct);

/** The signed-in person's wallet. */
export const walletState = () => cy.gql<WalletState>(WALLET_QUERY);

export const releaseOf = (detail: Readonly<ReleaseDetail>, kind: ReleaseKind): ReleaseRow => {
  const release = detail.releases.find((row) => row.kind === kind);
  if (!release) throw new Error(`The request carries no ${kind} payout.`);
  return release;
};

/**
 * Walk the stepper from the club to Create Pod and yield the pod's id. The pod
 * is physical and paid, at a venue the host does not own, so publishing it asks
 * the venue first.
 */
export function createPodThroughStepper(world: Readonly<PayoutWorld>, title: string, stamp: string): Cypress.Chainable<string> {
  cy.interceptOperation('CreatePodOptions');
  // noRedis: the club was made seconds ago, and the cached club list would not have it yet.
  cy.visitApp('/create-pod?noRedis=true');
  cy.wait('@CreatePodOptions');
  cy.byTestId('create-pod-stepper').should('be.visible');
  answerConsent();
  cy.byTestId(`create-pod-category-${world.path.superCategory.id}|${world.path.sub.id}`).should('exist');
  cy.byTestId('create-pod-locality').find('input').click();
  cy.byTestId(`create-pod-locality-option-${world.location.zone}`).click();
  cy.byTestId('create-pod-club').find('input').click();
  cy.byTestId(`create-pod-club-option-${world.club.id}`).click();
  nextStep();

  cy.byTestId('create-pod-basics-step').should('exist');
  cy.byTestId('pod_title-input').type(title);
  cy.byTestId('pod_description-input').type('A guided evening session with every seat scanned in at the door.', { delay: 0 });
  cy.byTestId('create-pod-offers-input-field').type('Coaching{enter}');
  cy.fixture('avatar.jpg', null).as('photo');
  attachThroughPicker(runPhoto(stamp, 'cover'));
  nextStep();

  cy.byTestId('create-pod-venue-slot-step').should('exist');
  cy.byTestId(`create-pod-venue-${world.venue.id}`).click();
  cy.byTestId('venue_space_label').find('[role="combobox"]').click();
  cy.byTestId(`venue-space-option-${SPACE_LABEL}`).click();
  cy.byTestId(`slot-tile-${world.slot.id}`).click();
  cy.byTestId('create-pod-venue-approval-note').should('be.visible');
  nextStep();

  cy.byTestId('create-pod-pricing-step').should('exist');
  cy.byTestId('create-pod-ticket-price-input').type(String(TICKET_PRICE));
  cy.byTestId('create-pod-terms-checkbox').find('input').check();
  cy.interceptOperation('PublishPodDraft');
  nextStep();
  // Publishing screens the content first, so the answer can take a while.
  return cy.wait('@PublishPodDraft', { timeout: 90000 }).then((call) => {
    const published = call.response?.body?.data?.publishPodDraft as { id: string; venue_approval_status: string } | undefined;
    if (!published) throw new Error(`Create Pod was refused: ${JSON.stringify(call.response?.body?.errors)}`);
    expect(published.venue_approval_status, 'a pod at somebody else’s venue waits for the venue').to.eq('PENDING');
    cy.location('pathname').should('eq', `/host/pod-pending/${published.id}`);
    cy.byTestId('pod-pending-page').should('be.visible');
    return cy.wrap(published.id, { log: false });
  });
}

/** The venue owner says yes to the host's request for the slot. */
export function approveSlotRequest(slotId: string, title: string): void {
  cy.interceptOperation('VenueSlotRequests');
  cy.visitApp('/venues/slot-requests');
  cy.wait('@VenueSlotRequests');
  cy.byTestId(`slot-request-${slotId}`).should('contain.text', title);
  answerConsent();
  cy.byTestId(`slot-request-${slotId}`).within(() => {
    cy.byTestId('slot-request-approve-trigger').click();
  });
  sendCode('ApproveVenueSlotRequest', () => {
    cy.byTestId('slot-request-approve-confirm').click();
  });
  cy.byTestId(`slot-request-${slotId}`).should('not.exist');
}

/** One guest buys one seat through the checkout, paying on the dummy gateway. */
export function bookSeat(podId: string, location: Readonly<PayoutWorld['location']>): void {
  cy.interceptOperation('CheckoutPod');
  cy.visitApp(`/checkout/${podId}`);
  cy.wait('@CheckoutPod');
  cy.byTestId('checkout-screen').should('be.visible');
  answerConsent();
  cy.byTestId('gateway-chip-dummy').should('exist');
  cy.byTestId('field-line1').type('14 Garden Lane');
  cy.byTestId('field-city').type(location.city);
  cy.byTestId('field-state').type(location.state);
  cy.byTestId('field-pincode').type(location.pincode);
  cy.interceptOperation('DummyCheckout');
  cy.byTestId('checkout-submit').should('be.enabled').click();
  cy.wait('@DummyCheckout', { timeout: 60000 }).then((call) => {
    const payment = call.response?.body?.data?.dummyCheckout as { id: string; total: number } | undefined;
    if (!payment) throw new Error(`The booking was refused: ${JSON.stringify(call.response?.body?.errors)}`);
    expect(payment.total, 'what the guest paid').to.eq(TICKET_PRICE);
  });
  cy.byTestId('checkout-success').should('be.visible');
}

/** Open the pod's attendance board as the host. */
export function openAttendance(podId: string): void {
  cy.interceptOperation('PodAttendanceBoard');
  cy.visitApp(`/host/pod/${podId}/attendance`);
  cy.wait('@PodAttendanceBoard');
  cy.byTestId('pod-attendance-view').should('be.visible');
  answerConsent();
}

/** Check one guest in at the door: their ticket code, entered by hand in the scanner. */
export function scanTicket(code: string): void {
  cy.byTestId('attendance-scan-cta').click();
  cy.byTestId('ticket-scan-dialog').should('be.visible');
  cy.byTestId('ticket-scan-manual-code').find('input').type(code, { delay: 0 });
  cy.interceptOperation('HostScanPodTicket');
  cy.byTestId('ticket-scan-check-code').click();
  cy.wait('@HostScanPodTicket').its('response.body.data.hostScanPodTicket.ok').should('eq', true);
  cy.byTestId('scan-confirmation').should('be.visible');
  cy.byTestId('scan-confirmation-done').click();
  cy.byTestId('ticket-scan-close').click();
  cy.byTestId('ticket-scan-dialog').should('not.exist');
}

/**
 * Complete the pod from Host Studio with the venue's final bill: the amount,
 * the bill itself, and "on top of the slot price".
 */
export function completePodWithVenueBill(podId: string, stamp: string): void {
  cy.interceptOperation('MyHostedPods');
  cy.visitApp('/host/manage');
  cy.wait('@MyHostedPods');
  cy.byTestId(`host-pod-row-${podId}`).scrollIntoView();
  answerConsent();
  cy.byTestId(`host-pod-actions-${podId}`).click();
  cy.byTestId(`host-pod-action-complete-${podId}`).click();
  cy.byTestId('pod-complete-dialog').should('be.visible');
  cy.byTestId('pod-complete-venue-bill').find('input').type(String(VENUE_BILL));
  cy.fixture('avatar.jpg', null).as('photo');
  attachThroughPicker(runPhoto(stamp, 'venue-bill'));
  cy.byTestId('pod-complete-include-slot').find('input').check();
  cy.byTestId('venue-bill-line-venue-total').should('contain.text', String(SLOT_PRICE + VENUE_BILL));
  cy.interceptOperation('HostCompletePodSettlement');
  cy.byTestId('pod-complete-submit').click();
  cy.wait('@HostCompletePodSettlement', { timeout: 60000 }).then((call) => {
    const releases = call.response?.body?.data?.completePodSettlement?.releases as
      | Array<{ kind: string; status: string }>
      | undefined;
    if (!releases) throw new Error(`Complete Pod was refused: ${JSON.stringify(call.response?.body?.errors)}`);
    expect(releases.map((release) => release.kind), 'payouts requested').to.include.members([
      'HOST_PAYMENT',
      'VENUE_BILLING',
      'CLUB_ADMIN',
    ]);
    for (const release of releases) expect(release.status, `${release.kind} status`).to.eq('PENDING');
  });
  cy.byTestId('pod-complete-dialog').should('not.exist');
}

/** Sign in to the Finance portal at its own door. */
export function signInToFinance(finance: Readonly<Actor>, password: string): void {
  cy.visit(financeUrl('/login'));
  cy.byTestId('login-screen').should('be.visible');
  cy.byTestId('field-email').type(finance.email);
  cy.byTestId('field-password').type(password, { log: false });
  cy.interceptOperation('ConsoleLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@ConsoleLogin').its('response.body.errors').should('not.exist');
  cy.byTestId('shell-user-menu-button').should('be.visible');
}

/** Find the pod's request in Payment Release, open it and approve every payout on it. */
export function approvePaymentRelease(requestId: string, title: string): void {
  cy.interceptOperation('PodPaymentReleasesTable');
  cy.visit(financeUrl('/payment-release'));
  cy.wait('@PodPaymentReleasesTable');
  cy.byTestId('table-toolbar-search').type(title);
  cy.byTestId(`finance-pod-payment-releases-row-${requestId}`, { timeout: 30000 }).should('contain.text', title);
  cy.interceptOperation('PodPaymentRelease');
  cy.byTestId(`payment-release-review-${requestId}`).click();
  cy.wait('@PodPaymentRelease');
  cy.location('pathname').should('eq', `/payment-release/${encodeURIComponent(requestId)}`);
  cy.byTestId('venue-bill-summary').should('be.visible');
  cy.byTestId('venue-bill-line-venue-total').should('contain.text', String(SLOT_PRICE + VENUE_BILL));
  for (const kind of ['HOST_PAYMENT', 'VENUE_BILLING', 'CLUB_ADMIN']) {
    cy.byTestId(`release-payout-${kind}`).should('be.visible');
  }
  cy.byTestId('release-approve-all').click();
  cy.interceptOperation('ApprovePodPaymentRelease');
  cy.byTestId('confirm-dialog-confirm').click();
  cy.wait('@ApprovePodPaymentRelease', { timeout: 60000 })
    .its('response.body.data.approvePodPaymentRelease.summary.status')
    .should('eq', 'APPROVED');
  cy.byTestId('release-approve-all').should('not.exist');
}

/** Open the signed-in person's wallet and check it shows exactly this one payout. */
export function expectWalletShows(amount: number): void {
  cy.interceptOperation('MyWallet');
  cy.visitApp('/host/wallet');
  cy.wait('@MyWallet');
  cy.byTestId('wallet-page').should('be.visible');
  answerConsent();
  cy.byTestId('wallet-balance').should('contain.text', amount.toFixed(2));
  cy.byTestId('wallet-transactions').within(() => {
    cy.byTestIdPrefix('wallet-transaction-').should('have.length', 1);
  });
}
