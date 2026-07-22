import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
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

const baseItem = (over: Partial<PodHistoryItem> = {}): PodHistoryItem =>
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
    pod: null,
    ...over,
  }) as PodHistoryItem;

const renderIt = (item: PodHistoryItem) =>
  render(
    <MockedProvider mocks={[appSettingsMock]} addTypename={false}>
      <PodHistoryTimeline item={item} />
    </MockedProvider>,
  );

describe('PodHistoryTimeline', () => {
  it('renders a JOINED booking with the join event and an available backout step', () => {
    renderIt(baseItem());
    expect(screen.getByText('Pod Joined')).toBeInTheDocument();
    expect(screen.getByText('Your spot was confirmed for this pod.')).toBeInTheDocument();
    // second (current) event for a non-backed-out booking
    expect(screen.getByText('Backout requested')).toBeInTheDocument();
    expect(
      screen.getByText('No backout request yet. Use Backout Pod from actions when needed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    // joined_at is formatted through useDateFormat
    expect(screen.getByText(/01 Jan 2026/)).toBeInTheDocument();
  });

  it('renders a backed-out booking with pending refund (waiting criteria, not initiated)', () => {
    renderIt(
      baseItem({
        status: 'BACKED_OUT',
        backed_out_at: '2026-02-01T10:00:00.000Z',
        refund_status: 'PENDING',
      }),
    );
    expect(screen.getByText('Backout request was recorded.')).toBeInTheDocument();
    expect(screen.getByText('Refund criteria')).toBeInTheDocument();
    expect(screen.getByText('Waiting for refund criteria to be completed.')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    // refund not processed => not-initiated leaf
    expect(screen.getByText('Refund not initiated')).toBeInTheDocument();
    expect(screen.getByText('Not initiated')).toBeInTheDocument();
    // backed_out_at date rendered
    expect(screen.getByText(/01 Feb 2026/)).toBeInTheDocument();
  });

  it('renders a backed-out booking with a processed refund (checked + initiated)', () => {
    renderIt(
      baseItem({
        status: 'BACKED_OUT',
        backed_out_at: '2026-02-01T10:00:00.000Z',
        refund_status: 'PROCESSED',
      }),
    );
    // refund not pending => criteria "checked" copy + Checked tag
    expect(screen.getByText('Refund criteria was checked for this backout.')).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();
    expect(screen.getByText('Refund initiated')).toBeInTheDocument();
    expect(
      screen.getByText('Refund has been initiated for this membership.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Initiated')).toBeInTheDocument();
  });

  it('treats BACKOUT_IN_PROCESS like a backed-out booking (refund NONE => checked/not-initiated)', () => {
    renderIt(
      baseItem({
        status: 'BACKOUT_IN_PROCESS',
        backed_out_at: '2026-02-01T10:00:00.000Z',
        refund_status: 'NONE',
      }),
    );
    expect(screen.getByText('Refund criteria was checked for this backout.')).toBeInTheDocument();
    expect(screen.getByText('Refund not initiated')).toBeInTheDocument();
  });
});
