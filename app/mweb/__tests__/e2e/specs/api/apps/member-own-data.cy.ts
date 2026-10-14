/// <reference types="cypress" />
import {
  AUTH_REQUIRED,
  expectRefused,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';

/**
 * A member's own money, bookings and partner records — signed-out callers are
 * refused, and the run account (a fresh member who has booked, paid, hosted
 * and administered nothing) reads back exactly nothing, which proves the reads
 * are scoped to the caller rather than leaking anyone else's rows. Scenario
 * map: Apps › Auth - Sessions ("Rejected token ends the session"), Wallet,
 * Bookings.
 *
 * Only reads whose empty answer the run account's life guarantees are here:
 * 06 files support tickets and signup can raise notifications and coins, so
 * those reads are left out.
 */

interface OwnRead {
  id: string;
  field: string;
  query: string;
  signedOut: Refusal;
  /** What the run account must read back. */
  empty: [] | null;
}

const READS: readonly OwnRead[] = [
  { id: 'MD-01', field: 'myPayments', query: `query E2eMyPayments { myPayments { __typename } }`, signedOut: SIGNED_OUT, empty: [] },
  { id: 'MD-02', field: 'myWalletTransactions', query: `query E2eMyWalletTx { myWalletTransactions { __typename } }`, signedOut: SIGNED_OUT, empty: [] },
  { id: 'MD-03', field: 'myWithdrawals', query: `query E2eMyWithdrawals { myWithdrawals { __typename } }`, signedOut: SIGNED_OUT, empty: [] },
  { id: 'MD-04', field: 'myEventTickets', query: `query E2eMyEventTickets { myEventTickets { __typename } }`, signedOut: SIGNED_OUT, empty: [] },
  { id: 'MD-05', field: 'myPodMemberships', query: `query E2eMyPodMemberships { myPodMemberships { __typename } }`, signedOut: AUTH_REQUIRED, empty: [] },
  { id: 'MD-06', field: 'myHost', query: `query E2eMyHost { myHost { __typename } }`, signedOut: AUTH_REQUIRED, empty: null },
  { id: 'MD-07', field: 'myVenues', query: `query E2eMyVenues { myVenues { __typename } }`, signedOut: AUTH_REQUIRED, empty: [] },
  { id: 'MD-08', field: 'myAdminClubs', query: `query E2eMyAdminClubs { myAdminClubs { __typename } }`, signedOut: SIGNED_OUT, empty: [] },
  { id: 'MD-09', field: 'myHostRequest', query: `query E2eMyHostRequest { myHostRequest { __typename } }`, signedOut: SIGNED_OUT, empty: null },
];

describe("API · A member's own data is theirs alone", { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  READS.forEach((read) => {
    it(`${read.id} ${read.field} refuses a signed-out caller and is empty for a new member`, () => {
      cy.gqlRaw(read.query, {}, { token: null }).then((body) => expectRefused(read.field, body, read.signedOut));
      cy.gqlRaw(read.query, {}, { token: memberToken }).then((body) => {
        expect(body.errors, `${read.field} errors`).to.be.undefined;
        expect(body.data?.[read.field]).to.deep.equal(read.empty);
      });
    });
  });

  it('MD-10 a forged token is treated as signed out, never as the member', () => {
    // Same header, payload and length class as a real token, with the signature broken.
    const forged = `${memberToken.slice(0, -4)}${memberToken.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA'}`;
    cy.gqlRaw(READS[0].query, {}, { token: forged }).then((body) => expectRefused('myPayments', body, SIGNED_OUT));
  });
});
