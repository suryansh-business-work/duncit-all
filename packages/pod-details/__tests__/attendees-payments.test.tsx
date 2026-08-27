/**
 * The two full-width tables under the columns.
 *
 * The attendee table's job is the WORD in the Status column — it is the word
 * a member quotes in a complaint, from the same rule mWeb and the app use. The
 * payments table is the shared table engine over one query per audience: ADMIN
 * filters the platform-wide table down to this pod, CLUB_ADMIN hands the pod to
 * an operation that can only ever read that one.
 */
import '@duncit/table/test-setup';
import type { MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import PodAttendeesSection from '../src/PodAttendeesSection';
import PodPaymentsSection from '../src/PodPaymentsSection';
import { POD_PAYMENTS_TABLE, type AdminPodAttendeeRow, type PodPaymentRow } from '../src/queries';
import { CLUB_ADMIN_POD_PAYMENTS } from '../src/queries.club-admin';
import { POD_ID, mountSection, settle } from './harness';

const row = (over: Partial<AdminPodAttendeeRow>): AdminPodAttendeeRow => ({
  member_id: 'pm-1',
  seats: 1,
  companions: [],
  user_id: 'u-1',
  full_name: 'Meera N',
  email: 'meera@duncit.com',
  phone: '9000000001',
  profile_photo: null,
  is_host: false,
  status: 'JOINED',
  joined_at: '2026-08-01T10:00:00.000Z',
  backed_out_at: null,
  source: 'APP',
  refund_status: null,
  payment_id: 'pay-1',
  backout_no: null,
  replaced_by_user_id: null,
  replaced_by_name: null,
  participation: { joined_at: '2026-08-01T10:00:00.000Z', attended: false, attendance_recorded: false },
  ...over,
});

describe('PodAttendeesSection', () => {
  const PAST = '2020-08-30T12:30:00.000Z';
  const FUTURE = '2099-08-30T12:30:00.000Z';

  // "Joined" and "Attendee" are also column headers, so those chips make two.
  it.each([
    ['Visited', row({}), PAST, 1],
    ['Joined', row({}), FUTURE, 2],
    ['Backout in process', row({ status: 'BACKOUT_IN_PROCESS' }), FUTURE, 1],
    ['Backed out', row({ status: 'BACKED_OUT' }), FUTURE, 1],
    ['Host', row({ status: null, is_host: true, member_id: null }), FUTURE, 1],
    ['Attendee', row({ status: null }), FUTURE, 2],
  ])('labels the booking "%s"', (label, booking, podDateTime, count) => {
    mountSection(<PodAttendeesSection rows={[booking]} loading={false} podDateTime={podDateTime} />);

    expect(screen.getAllByText(label)).toHaveLength(count);
    expect(screen.getByText('Meera N')).toBeInTheDocument();
  });

  it('counts the bookings in the badge', () => {
    mountSection(
      <PodAttendeesSection rows={[row({}), row({ member_id: 'pm-2', user_id: 'u-2', full_name: 'Rahul S' })]} loading={false} />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Rahul S')).toBeInTheDocument();
  });

  it('shows the progress bar only while the FIRST page is still coming', () => {
    mountSection(<PodAttendeesSection rows={[]} loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Nobody has joined this pod yet.')).not.toBeInTheDocument();
  });

  it('says when nobody has joined', () => {
    mountSection(<PodAttendeesSection rows={[]} loading={false} />);

    expect(screen.getByText('Nobody has joined this pod yet.')).toBeInTheDocument();
  });

  it('shows the failure in place of the table', () => {
    mountSection(<PodAttendeesSection rows={[]} loading={false} errorText="attendees down" />);

    expect(screen.getByText('attendees down')).toBeInTheDocument();
  });
});

const payment = (over: Partial<PodPaymentRow> = {}) => ({
  __typename: 'PaymentTableRow',
  id: 'p-1',
  payment_id: 'PAY-1',
  invoice_no: 'INV-2026-0001',
  user_id: 'u-1',
  user_name: 'Meera N',
  user_email: 'meera@duncit.com',
  total: 250,
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'RAZORPAY',
  coupon_code: 'SAVE10',
  paid_at: '2026-08-02T10:00:00.000Z',
  created_at: '2026-08-02T09:59:00.000Z',
  ...over,
});

const page = (rows: unknown[]) => ({
  __typename: 'PaymentsTablePage',
  rows,
  total: rows.length,
  page: 1,
  page_size: 25,
});

const firstPage = (filters: unknown[]) => ({
  search: null,
  page: 1,
  page_size: 25,
  sort_by: 'created_at',
  sort_dir: 'desc',
  filters,
});

const adminMock = (rows: unknown[]): MockedResponse => ({
  request: {
    query: POD_PAYMENTS_TABLE,
    variables: { query: firstPage([{ field: 'pod_id', op: 'eq', value: POD_ID, values: null }]) },
  },
  result: { data: { paymentsTable: page(rows) } },
});

const clubAdminMock = (rows: unknown[]): MockedResponse => ({
  request: { query: CLUB_ADMIN_POD_PAYMENTS, variables: { query: firstPage([]), pod_id: POD_ID } },
  result: { data: { paymentsTable: page(rows) } },
});

describe('PodPaymentsSection', () => {
  const PREFS_KEY = 'duncit-table-cols:admin-pod-payments';

  beforeEach(() => {
    // The coupon and created-at columns ship hidden; a reader who turned them
    // on keeps them on, so their cells have to format too.
    globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify({ coupon_code: false, created_at: false }));
  });

  afterEach(() => {
    globalThis.localStorage.removeItem(PREFS_KEY);
  });

  it('renders each payment with its invoice, payer, amount and state', async () => {
    mountSection(<PodPaymentsSection podId={POD_ID} />, [adminMock([payment()])]);
    await settle();

    expect(await screen.findByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Meera N')).toBeInTheDocument();
    expect(screen.getByText('meera@duncit.com')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('RAZORPAY')).toBeInTheDocument();
    expect(screen.getByText('SAVE10')).toBeInTheDocument();
  });

  it('falls back to the payment id and dashes for what a failed attempt never got', async () => {
    mountSection(<PodPaymentsSection podId={POD_ID} />, [
      adminMock([payment({ invoice_no: null, gateway: null, coupon_code: null, paid_at: null, status: 'FAILED' })]),
    ]);
    await settle();

    expect(await screen.findByText('PAY-1')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('reads the club-scoped operation, with the pod as a variable the server applies', async () => {
    mountSection(<PodPaymentsSection podId={POD_ID} />, [clubAdminMock([payment()])], 'CLUB_ADMIN');
    await settle();

    expect(await screen.findByText('INV-2026-0001')).toBeInTheDocument();
  });

  it('says when the pod has no payments', async () => {
    mountSection(<PodPaymentsSection podId={POD_ID} />, [adminMock([])]);
    await settle();

    expect(await screen.findByText('No payments recorded for this pod.')).toBeInTheDocument();
  });
});
