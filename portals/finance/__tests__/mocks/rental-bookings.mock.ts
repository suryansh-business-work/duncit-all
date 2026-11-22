import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { gql } from '@apollo/client';
import { fireEvent, screen, within } from '@testing-library/react';
import type { RentalDetailLinks } from '@duncit/venue-rentals';
import {
  ADD_RENTAL_BOOKING_PROOF_MUTATION,
  RENTAL_BOOKING_DETAIL_QUERY,
  SEND_RENTAL_REFUND_MUTATION,
  type RentalBookingDetail,
  type RentalBookingRow,
} from '@duncit/utils';

/**
 * Rented items: one rental row, its detail (Finance's or the venue's view) and
 * the two detail mutations. The documents are parsed from the same strings the
 * package parses, so a mock only matches what the desk really sends.
 */
const DETAIL = gql(RENTAL_BOOKING_DETAIL_QUERY);
const SEND = gql(SEND_RENTAL_REFUND_MUTATION);
const PROOF = gql(ADD_RENTAL_BOOKING_PROOF_MUTATION);

type Typed<T> = T & { __typename: string };

/** A racket returned in good shape whose ₹500 deposit refund Razorpay could not send: it waits for Finance. */
export const makeRentalRow = (over: Partial<RentalBookingRow> = {}): Typed<RentalBookingRow> => ({
  __typename: 'RentalBooking',
  id: 'rb1',
  currency_symbol: '₹',
  payment_ref: 'DUN-PAY-7001',
  pod_id: 'pod1',
  pod_title: 'Sunday Smash',
  guest_name: 'Riya Sharma',
  venue_id: 'v1',
  item_id: 'it1',
  name: 'Racket',
  image_url: 'https://ik.imagekit.io/duncit/racket.jpg',
  unit: 'HOUR',
  rate: 50,
  units: 2,
  quantity: 1,
  rent_amount: 100,
  deposit_amount: 500,
  status: 'RETURNED',
  damage_claim: 0,
  damage_note: '',
  refund_due: 500,
  refund_status: 'DUE',
  refund_ref: '',
  refunded_at: null,
  deposit_at_venue: 0,
  commission_pct: 10,
  commission_amount: 10,
  venue_amount: 90,
  release_id: null,
  marked_at: '2026-11-21T12:00:00.000Z',
  auto_released: false,
  created_at: '2026-11-20T10:00:00.000Z',
  refund_state: 'REQUIRES_REVIEW',
  refund_eligible: 500,
  refund_pending: 0,
  refunded_amount: 0,
  refund_outstanding: 500,
  refund_review_reason: 'Razorpay refused the refund three times',
  refund_gateway_status: 'RECONCILIATION_REQUIRED',
  deposit_policy: 'DUNCIT_REFUND',
  ...over,
});

/** The same rental as Finance sees it: emails, the payment and the Razorpay ids included. */
export const makeRentalDetail = (
  over: Partial<RentalBookingDetail> = {},
  booking: Partial<RentalBookingRow> = {},
): Typed<RentalBookingDetail> => ({
  __typename: 'RentalBookingDetail',
  booking: makeRentalRow(booking),
  viewer: 'FINANCE',
  guest: { __typename: 'RentalPerson', id: 'u1', name: 'Riya Sharma', phone: '+91 9800000000', email: 'riya@duncit.com' } as Typed<
    RentalBookingDetail['guest']
  >,
  venue: {
    __typename: 'RentalVenueContact',
    id: 'v1',
    name: 'Court Nine',
    contact_name: 'Arjun Mehta',
    phone: '+91 9811111111',
    email: 'desk@courtnine.in',
    address: '12 MG Road, Pune',
  } as Typed<RentalBookingDetail['venue']>,
  pod: {
    __typename: 'RentalPodInfo',
    id: 'pod1',
    public_id: 'sunday-smash',
    club_public_id: 'pune-badminton',
    title: 'Sunday Smash',
    starts_at: '2026-11-21T08:00:00.000Z',
    ends_at: '2026-11-21T10:00:00.000Z',
  } as Typed<NonNullable<RentalBookingDetail['pod']>>,
  payment: {
    __typename: 'RentalPaymentInfo',
    payment_doc_id: 'pd1',
    payment_ref: 'DUN-PAY-7001',
    gateway: 'RAZORPAY',
    razorpay_payment_id: 'pay_RZP777',
    total: 899,
    status: 'SUCCESS',
    paid_at: '2026-11-20T10:00:00.000Z',
  } as Typed<NonNullable<RentalBookingDetail['payment']>>,
  refunds: [
    {
      __typename: 'RentalRefundAttempt',
      id: 'gr1',
      source: 'RENTAL',
      status: 'RECONCILIATION_REQUIRED',
      amount: 500,
      razorpay_refund_id: null,
      attempts: 3,
      last_error: 'BAD_REQUEST_ERROR: refund amount exceeds',
      requested_at: '2026-11-21T12:01:00.000Z',
      processed_at: null,
      created_at: '2026-11-21T12:01:00.000Z',
    } as Typed<RentalBookingDetail['refunds'][number]>,
  ],
  proofs: [],
  events: [
    {
      __typename: 'RentalEvent',
      type: 'RETURNED',
      at: '2026-11-21T12:00:00.000Z',
      actor_name: 'Arjun Mehta',
      actor_role: 'VENUE',
      amount: null,
      detail: '',
    } as Typed<RentalBookingDetail['events'][number]>,
    {
      __typename: 'RentalEvent',
      type: 'REFUND_REVIEW',
      at: '2026-11-21T13:00:00.000Z',
      actor_name: '',
      actor_role: 'SYSTEM',
      amount: 500,
      detail: 'Razorpay refused the refund three times',
    } as Typed<RentalBookingDetail['events'][number]>,
  ],
  ...over,
});

/** The venue's view of the same rental: the server sends no emails, no payment and no Razorpay ids. */
export const makeVenueRentalDetail = (booking: Partial<RentalBookingRow> = {}): Typed<RentalBookingDetail> => {
  const finance = makeRentalDetail({}, booking);
  return {
    ...finance,
    viewer: 'VENUE',
    guest: { ...finance.guest, email: null },
    venue: { ...finance.venue, email: null },
    payment: null,
    refunds: finance.refunds.map((attempt) => ({ ...attempt, razorpay_refund_id: null, last_error: '', attempts: 0 })),
  };
};

export const rentalDetailMock = (detail: RentalBookingDetail, id = detail.booking.id): MockedResponse => ({
  request: { query: DETAIL, variables: { id } },
  result: { data: { rentalBookingDetail: detail } },
});

export const rentalDetailErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: DETAIL, variables: { id } },
  result: { errors: [new GraphQLError(message)] },
});

/** Answers only the exact note Finance typed, so a wrong payload fails the test. */
export const sendRentalRefundMock = (id: string, note: string, result: RentalBookingDetail | { fail: string }): MockedResponse => ({
  request: { query: SEND, variables: { id, note } },
  result: 'fail' in result ? { errors: [new GraphQLError(result.fail)] } : { data: { sendRentalRefund: result } },
});

export const addRentalProofMock = (
  id: string,
  input: { note: string; image_urls: string[] },
  result: RentalBookingDetail | { fail: string },
): MockedResponse => ({
  request: { query: PROOF, variables: { id, input } },
  result: 'fail' in result ? { errors: [new GraphQLError(result.fail)] } : { data: { addRentalBookingProof: result } },
});

/** The links a console hands the desk: mWeb for the pod, the Admin user page for the guest. */
export const RENTAL_TEST_LINKS: RentalDetailLinks = {
  mwebUrl: 'https://mweb.test',
  profileUrl: (id) => `https://admin.test/users/${id}`,
};

/** The open drawer, once the racket's rental has loaded. */
export const rentalDrawer = async () => within(await screen.findByRole('dialog', { name: 'Rental: Racket' }));

/** Opens the board's first row the way a click on it does. */
export const openFirstRentalRow = async () => fireEvent.click(await screen.findByTestId('row-open'));
