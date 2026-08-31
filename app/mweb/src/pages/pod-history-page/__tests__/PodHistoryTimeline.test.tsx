import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import PodHistoryTimeline from '../PodHistoryTimeline';
import { PUBLIC_APP_SETTINGS } from '../../../utils/dateFormat';
import type { PodHistoryItem } from '../queries';

const appSettingsMock = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        min_birth_year: 1940,
        max_birth_year: 2012,
        draft_retention_days: 3,
      },
    },
  },
};

const FUTURE = '2999-01-01T18:00:00.000Z';
const PAST = '2000-01-01T18:00:00.000Z';

const backout = (over: Record<string, unknown> = {}) => ({
  backout_no: 'DUN-BKO-000007',
  status: 'IN_PROCESS',
  attempt_no: 1,
  seats: 1,
  seats_before: 1,
  refund_amount: 450,
  refund_status: 'NONE',
  refund_processed_at: null,
  created_at: '2026-02-01T10:00:00.000Z',
  events: [{ status: 'IN_PROCESS', at: '2026-02-01T10:00:00.000Z' }],
  ...over,
});

const participation = (over: Record<string, unknown> = {}) => ({
  joined_at: '2026-01-01T10:00:00.000Z',
  attended: false,
  attendance_recorded: false,
  pod_cancelled_by: null,
  pod_cancelled_at: null,
  cancel_refund_status: 'NONE',
  backouts: [],
  ...over,
});

const baseItem = (podDateTime: string, over: Record<string, unknown> = {}): PodHistoryItem =>
  ({
    id: 'mem-1',
    status: 'JOINED',
    joined_at: '2026-01-01T10:00:00.000Z',
    backed_out_at: null,
    payment_id: 'pay-1',
    refund_status: 'NONE',
    refund_payment_id: null,
    referral_token: null,
    source: 'WEB',
    participation: participation(over),
    pod: { pod_date_time: podDateTime },
  }) as unknown as PodHistoryItem;

const renderIt = (item: PodHistoryItem) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[appSettingsMock]}>
      <PodHistoryTimeline item={item} />
    </MockedProvider>,
  );

describe('PodHistoryTimeline', () => {
  it('says nothing about a refund nobody asked for', () => {
    renderIt(baseItem(FUTURE));
    expect(screen.getByText('Pod Joined')).toBeInTheDocument();
    expect(screen.getByText('You have successfully joined the pod.')).toBeInTheDocument();
    expect(screen.queryByText('Refund Initiated')).not.toBeInTheDocument();
    // joined_at is formatted through useDateFormat
    expect(screen.getByText(/01 Jan 2026/)).toBeInTheDocument();
  });

  it('says the seat is still on sale while the request is open', () => {
    renderIt(baseItem(FUTURE, { backouts: [backout()] }));
    expect(screen.getByText('Pod Backout Requested')).toBeInTheDocument();
    expect(screen.getByText('DUN-BKO-000007')).toBeInTheDocument();
    expect(screen.getByText('Finding Your Replacement')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('carries the refund state of the request that earned it', () => {
    renderIt(
      baseItem(FUTURE, {
        backouts: [
          backout({
            status: 'SPOT_FILLED',
            refund_status: 'PROCESSED',
            refund_processed_at: '2026-02-05T10:00:00.000Z',
            events: [{ status: 'SPOT_FILLED', at: '2026-02-04T10:00:00.000Z' }],
          }),
        ],
      }),
    );
    expect(screen.getByText('Spot Filled')).toBeInTheDocument();
    expect(screen.getByText('Refund Initiated')).toBeInTheDocument();
  });

  it('declines the refund for a seat nobody took once the pod has happened', () => {
    renderIt(baseItem(PAST, { backouts: [backout()] }));
    expect(screen.getByText('Spot Not Filled')).toBeInTheDocument();
    expect(screen.getByText('Refund Not Eligible')).toBeInTheDocument();
  });

  it('says how many seats a partial backout gave up, and still records attendance', () => {
    renderIt(
      baseItem(PAST, {
        attended: true,
        attendance_recorded: true,
        backouts: [backout({ seats: 1, seats_before: 3, status: 'SPOT_FILLED' })],
      }),
    );
    expect(screen.getByText('Partial Backout Requested')).toBeInTheDocument();
    expect(screen.getByText('You released 1 of 3 seats and kept 2.')).toBeInTheDocument();
    expect(screen.getByText('Pod Attended')).toBeInTheDocument();
  });

  it('does not claim somebody was absent when nobody took attendance', () => {
    renderIt(baseItem(PAST));
    expect(screen.getByText('Attendance Not Recorded')).toBeInTheDocument();
    expect(screen.queryByText('Pod Not Attended')).not.toBeInTheDocument();
  });

  it('names who cancelled the pod, and keeps the open request visible', () => {
    renderIt(
      baseItem(FUTURE, {
        pod_cancelled_by: 'HOST',
        pod_cancelled_at: '2026-02-10T10:00:00.000Z',
        cancel_refund_status: 'PROCESSED',
        backouts: [backout()],
      }),
    );
    expect(screen.getByText('Pod Cancelled')).toBeInTheDocument();
    expect(screen.getByText('The pod was cancelled by the host.')).toBeInTheDocument();
    // The id support works from must survive the cancellation.
    expect(screen.getByText('DUN-BKO-000007')).toBeInTheDocument();
  });

  it('promises no refund for a cancellation that moved no money', () => {
    renderIt(
      baseItem(FUTURE, {
        pod_cancelled_by: 'CLUB_ADMIN',
        pod_cancelled_at: '2026-02-10T10:00:00.000Z',
        cancel_refund_status: 'NOT_ELIGIBLE',
      }),
    );
    expect(screen.getByText('The pod was cancelled by the club admin.')).toBeInTheDocument();
    expect(screen.getByText('Refund Not Eligible')).toBeInTheDocument();
    expect(screen.queryByText('Refund Initiated')).not.toBeInTheDocument();
  });
});
