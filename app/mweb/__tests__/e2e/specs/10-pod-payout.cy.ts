/// <reference types="cypress" />
import { E2E_PURGE_MUTATION, runMarker } from '@duncit/utils';
import {
  VENUE_BILL,
  approvePaymentRelease,
  approveSlotRequest,
  attendanceRows,
  bookSeat,
  completePodWithVenueBill,
  createPodThroughStepper,
  expectWalletShows,
  hostRequestId,
  myTicketCode,
  openAttendance,
  podFinance,
  podState,
  releaseDetail,
  releaseOf,
  scanTicket,
  shortenPod,
  signInToFinance,
  venueCommissionPct,
  walletState,
  type ReleaseDetail,
  type ReleaseKind,
} from '../support/pod-payout-steps';
import {
  SLOT_PRICE,
  buildPayoutWorld,
  podLeadMinutes,
  retirePayoutWorld,
  type Actor,
  type PayoutWorld,
} from '../support/pod-payout-world';
import { runAccount } from '../support/run-account';

/**
 * 10 — A pod's money, from Create Pod to the wallets, live.
 *
 * One pod's whole life, each step by the person who really takes it: the host
 * creates a paid pod at somebody else's venue, the venue owner approves the
 * slot, four guests buy a seat, the host scans three of them in at the door,
 * the pod ends, the host completes it with the venue's final bill, Finance
 * approves the request in the Finance portal, and the host, the venue owner
 * and the club admin each find their payout in their wallet.
 *
 * The scenarios run in order and share the pod, so once one fails the rest are
 * skipped rather than run against a pod that is not there. `before` makes the people and places through the API
 * (support/pod-payout-world.ts) as an operator — CYPRESS_E2E_OPERATOR_EMAIL /
 * CYPRESS_E2E_OPERATOR_PASSWORD, a SUPER_ADMIN on the server under test — and
 * `after` removes them. Complete Pod only opens once a pod is over, and a host
 * cannot schedule less than half an hour, so after the bookings staff bring the
 * pod's end forward to a minute past its start, and POD-06 waits for it.
 *
 * The Finance portal is visited on its own origin (CYPRESS_FINANCE_URL), which
 * reloads the spec: what the journey has made so far is kept with the
 * `journey:keep` task and read back, so `before` builds the world only once.
 */

/** The fourth guest pays and never arrives: a seat that is booked but not paid out on. */
const NO_SHOW = 3;

/** How long the pod runs once staff have brought its end forward. */
const POD_RUNS_MS = 60_000;

const PORTAL_VIEWPORT = [1280, 800] as const;

/** Everything a later scenario needs from an earlier one. */
interface Journey {
  world: PayoutWorld;
  podId: string;
  requestId: string;
  ticketCodes: string[];
  /** When the pod is over — the slot's end until staff bring it forward. */
  endsAt: string;
  failed: boolean;
}

describe('10 Pod payout', () => {
  const account = runAccount();
  const password = account.password('SIGNUP');
  const title = `${runMarker(account.stamp, 'pod')} Evening studio session`;
  const journeyKey = `pod-payout-${account.stamp}`;
  let journey: Journey;
  let world: PayoutWorld;

  /** Keep the journey where a spec reload cannot lose it. */
  const keep = () => cy.task('journey:keep', { key: journeyKey, value: journey }, { log: false });

  const signInAs = (actor: Readonly<Actor>) => cy.apiLogin(actor.email, password);

  /** Fails with the reason when the pod has started: nobody can book a pod that is running. */
  const assertBeforeStart = (what: string) => {
    if (Date.now() >= new Date(world.slot.startAt).getTime()) {
      throw new Error(
        `The pod started before ${what}. Give the run longer with CYPRESS_E2E_POD_LEAD_MINUTES (now ${podLeadMinutes()}).`,
      );
    }
  };

  before(() => {
    cy.useRunTraffic();
    cy.task<Journey | null>('journey:read', journeyKey, { log: false }).then((kept) => {
      if (kept) {
        journey = kept;
        world = kept.world;
        return;
      }
      buildPayoutWorld(account).then((built) => {
        world = built;
        journey = { world: built, podId: '', requestId: '', ticketCodes: [], endsAt: built.slot.endAt, failed: false };
        keep();
      });
    });
  });

  beforeEach(function () {
    if (journey.failed) this.skip();
  });

  afterEach(function () {
    if (this.currentTest?.state !== 'failed') return;
    journey.failed = true;
    keep();
  });

  after(() => {
    if (!world) return;
    retirePayoutWorld(world);
    if (Cypress.env('E2E_KEEP_DATA')) return;
    cy.staffGql(E2E_PURGE_MUTATION, { input: { stamp: account.stamp, signup_email: account.email } });
  });

  it('POD-01 the host creates a paid pod at the venue’s slot, and it waits for the venue to approve', () => {
    signInAs(world.host);
    createPodThroughStepper(world, title, account.stamp).then((id) => {
      journey.podId = id;
      keep();
      podState(id, world.operatorToken).then((pod) => {
        expect(pod.venue_approval_status).to.eq('PENDING');
        expect(pod.is_active, 'a pod the venue has not approved is not live').to.eq(false);
      });
    });
  });

  it('POD-02 the venue owner approves the slot request, and the pod goes live', () => {
    assertBeforeStart('the venue could approve it');
    signInAs(world.venueOwner);
    approveSlotRequest(world.slot.id, title);
    podState(journey.podId, world.operatorToken).then((pod) => {
      expect(pod.venue_approval_status).to.eq('APPROVED');
      expect(pod.is_active).to.eq(true);
    });
  });

  it('POD-03 with nobody booked, the pod does not cover the venue', () => {
    podFinance(journey.podId, world.operatorToken).then((finance) => {
      expect(finance.bookings_count).to.eq(0);
      expect(finance.collected_total).to.eq(0);
      expect(finance.waterfall.host_receives, 'host side with no bookings').to.be.at.most(0);
    });
  });

  it('POD-04 four guests each buy a seat at checkout, and the pod turns positive', () => {
    for (const guest of world.attendees) {
      cy.then(() => assertBeforeStart(`${guest.firstName} could book`));
      signInAs(guest);
      bookSeat(journey.podId, world.location);
      myTicketCode(journey.podId).then((code) => {
        journey.ticketCodes.push(code);
        keep();
      });
    }
    podFinance(journey.podId, world.operatorToken).then((finance) => {
      expect(finance.bookings_count).to.eq(world.attendees.length);
      expect(finance.settlement_status).to.eq('LIVE');
      expect(finance.waterfall.host_receives, 'host side once the seats are sold').to.be.greaterThan(0);
    });
    cy.then(() => {
      assertBeforeStart('staff could shorten it');
      const oneMinuteIn = new Date(new Date(world.slot.startAt).getTime() + POD_RUNS_MS).toISOString();
      shortenPod(journey.podId, oneMinuteIn, world.operatorToken).then((endsAt) => {
        journey.endsAt = endsAt;
        keep();
      });
    });
  });

  it('POD-05 the host scans three guests in at the door; the fourth stays unmarked', () => {
    signInAs(world.host);
    attendanceRows(journey.podId).then((rows) => {
      expect(rows.filter((row) => row.attended), 'marked before the door opens').to.have.length(0);
      expect(rows).to.have.length(world.attendees.length);
    });
    openAttendance(journey.podId);
    journey.ticketCodes.filter((_code, index) => index !== NO_SHOW).forEach((code) => scanTicket(code));
    attendanceRows(journey.podId).then((rows) => {
      const noShow = world.attendees[NO_SHOW];
      for (const row of rows) {
        const present = row.user_id !== noShow.id;
        expect(row.attended, `attended: ${row.user_id}`).to.eq(present);
        if (present) expect(row.marked_method).to.eq('HOST_SCAN');
        const section = present ? 'attendance-marked' : 'attendance-unmarked';
        cy.byTestId(section).within(() => {
          cy.byTestId(`attendance-row-${row.membership_id}`).should('exist');
        });
      }
    });
  });

  it('POD-06 once the pod is over, the host completes it with the venue’s final bill, and nobody is paid yet', () => {
    // The pod really runs; Complete Pod is only offered on a pod that has ended.
    cy.then(() => {
      const untilOver = new Date(journey.endsAt).getTime() - Date.now();
      if (untilOver > 0) cy.wait(untilOver + 5000);
    });
    signInAs(world.host);
    completePodWithVenueBill(journey.podId, account.stamp);
    hostRequestId(journey.podId).then((id) => {
      journey.requestId = id;
      keep();
      releaseDetail(id, world.operatorToken).then((detail) => {
        expect(detail.summary.status).to.eq('PENDING');
        expect(detail.summary.has_bill, 'the bill came with the request').to.eq(true);
        expect(releaseOf(detail, 'VENUE_BILLING').bill_url, 'the uploaded bill').to.match(/^https?:\/\//);
        expect(releaseOf(detail, 'HOST_PAYMENT').amount_requested).to.be.greaterThan(0);
        expect(releaseOf(detail, 'CLUB_ADMIN').amount_requested).to.be.greaterThan(0);
        // "On top of the slot price": the venue is paid on both, less Duncit's commission on a venue.
        venueCommissionPct(world.operatorToken).then((pct) => {
          const charged = SLOT_PRICE + VENUE_BILL;
          expect(releaseOf(detail, 'VENUE_BILLING').amount_requested, 'venue payout').to.eq(
            Math.round(charged * (100 - pct)) / 100,
          );
        });
      });
    });
    podFinance(journey.podId, world.operatorToken).then((finance) => {
      expect(finance.settlement_status).to.eq('PENDING_APPROVAL');
    });
    for (const person of [world.host, world.venueOwner, world.clubAdmin]) {
      signInAs(person);
      walletState().then((wallet) => {
        expect(wallet.myWallet.balance, `${person.email} before Finance approves`).to.eq(0);
        expect(wallet.myWalletTransactions).to.have.length(0);
      });
    }
  });

  it('POD-07 Finance opens the request in Payment Release, sees the bill and approves every payout', () => {
    cy.viewport(...PORTAL_VIEWPORT);
    signInToFinance(world.finance, password);
    approvePaymentRelease(journey.requestId, title);
    releaseDetail(journey.requestId, world.operatorToken).then((detail) => {
      expect(detail.summary.status).to.eq('APPROVED');
      for (const release of detail.releases) {
        expect(release.status, `${release.kind} status`).to.eq('APPROVED');
        expect(release.approved_amount, `${release.kind} approved in full`).to.eq(release.amount_requested);
      }
    });
    podFinance(journey.podId, world.operatorToken).then((finance) => {
      expect(finance.settlement_status).to.eq('SETTLED');
    });
  });

  it('POD-08 the host, the venue owner and the club admin each find their payout in their wallet', () => {
    const payees: ReadonlyArray<readonly [ReleaseKind, (w: PayoutWorld) => Actor]> = [
      ['HOST_PAYMENT', (w) => w.host],
      ['VENUE_BILLING', (w) => w.venueOwner],
      ['CLUB_ADMIN', (w) => w.clubAdmin],
    ];
    releaseDetail(journey.requestId, world.operatorToken).then((detail: ReleaseDetail) => {
      for (const [kind, who] of payees) {
        const person = who(world);
        const release = releaseOf(detail, kind);
        expect(release.beneficiary_email, `${kind} beneficiary`).to.eq(person.email);
        signInAs(person);
        walletState().then((wallet) => {
          expect(wallet.myWallet.balance, `${kind} wallet balance`).to.eq(release.amount_requested);
          expect(wallet.myWalletTransactions).to.have.length(1);
          const [credit] = wallet.myWalletTransactions;
          expect(credit.type).to.eq('CREDIT');
          expect(credit.source).to.eq('POD_COMPLETION');
          expect(credit.amount).to.eq(release.amount_requested);
          expect(credit.pod_id).to.eq(journey.podId);
        });
        expectWalletShows(release.amount_requested);
      }
    });
    // A guest's wallet is not part of a payout: the one who never came is not refunded into it either.
    signInAs(world.attendees[NO_SHOW]);
    walletState().then((wallet) => {
      expect(wallet.myWallet.balance).to.eq(0);
    });
  });
});
