/**
 * Completing a pod: the settlement, and the two things it is computed from.
 *
 * The payout comes from the SCANNED seats — a booking nobody checked in is not
 * part of it, even though its money was collected and is not refunded. So the
 * preview has to say which seats produced the figure, and the roster it sits
 * over is the evidence for it.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodCompleteDialog from '../src/pod-complete/PodCompleteDialog';
import PodMediaSummary from '../src/pod-complete/PodMediaSummary';
import SettlementPreview from '../src/pod-complete/SettlementPreview';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { COMPLETE_POD, POD_SETTLEMENT_PREVIEW } from '../src/queries';
import { POD_MEDIA_BOARD } from '../src/pod-media/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';

const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };
const VENUE_POD = { ...POD, venue_id: 'venue-1' };
const labels = labelsFor();
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const waterfall = {
  __typename: 'PodFinanceWaterfall',
  version: 1,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 180,
  net_amount: 820,
  platform_fee_pct: 10,
  platform_fee_amount: 82,
  pool_amount: 738,
  venue_amount: 300,
  venue_commission_pct: 5,
  venue_commission_amount: 15,
  venue_receives: 285,
  host_amount: 438,
  host_commission_pct: 0,
  host_commission_amount: 0,
  host_receives: 400,
  duncit_revenue: 197,
  host_earn_pct: 40,
};

const attendee = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodSettlementAttendee',
  membership_id: 'm-1',
  user_id: 'u-1',
  name: 'Asha Rao',
  seats: 2,
  attended: true,
  attended_at: '2026-08-30T12:40:00.000Z',
  amount: 500,
  ...over,
});

const settlement = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodSettlement',
  currency_symbol: '₹',
  collected_total: 1200,
  has_venue: true,
  paying_attendees: 8,
  attended_seats: 8,
  booked_seats: 10,
  attended_total: 1000,
  attendees: [attendee()],
  waterfall,
  ...over,
});

const previewMock = (over: Record<string, unknown> = {}, amount = 0): MockedResponse => ({
  request: {
    query: POD_SETTLEMENT_PREVIEW,
    variables: { pod_id: 'pod-1', venue_bill_amount: amount },
  },
  result: { data: { podSettlementPreview: settlement(over) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mediaBoardMock = (items: unknown[] = []): MockedResponse => ({
  request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: 'pod-1' } },
  result: {
    data: {
      podMediaBoard: {
        __typename: 'PodMediaBoard',
        pod_id: 'DUN-POD-4821',
        pod_title: 'Sunday Badminton',
        pod_date_time: '2026-08-30T12:30:00.000Z',
        viewer: 'HOST',
        can_upload: true,
        is_cancelled: false,
        count: items.length,
        items,
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = [], config = {}) =>
  render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig(config)}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('SettlementPreview', () => {
  const preview = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) =>
    wrap(
      <SettlementPreview podId="pod-1" venueBillAmount={0} onScan={vi.fn()} refreshToken={0} {...(props as never)} />,
      mocks,
    );

  it('waits on the figures rather than showing a payout it does not have', () => {
    const { container } = preview([previewMock()]);

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  // Not collected_total: folding in seats nobody scanned would make every line
  // below fail to add up.
  it('says which seats the figure came from', async () => {
    preview([previewMock()]);
    await settle();

    expect(screen.getByTestId('settlement-attendees').textContent).toContain(
      'Based on 8 attended seats of 10 booked',
    );
    expect(screen.getByText(/was collected from seats nobody scanned in/)).toContain;
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
  });

  it('words a single attended seat in the singular', async () => {
    preview([previewMock({ attended_seats: 1, booked_seats: 1, attended_total: 1200 })]);
    await settle();

    expect(screen.getByTestId('settlement-attendees').textContent).toContain(
      'Based on 1 attended seat of 1 booked',
    );
  });

  it('says nothing about unscanned money when every booked seat came', async () => {
    preview([previewMock({ attended_seats: 10, booked_seats: 10 })]);
    await settle();

    expect(screen.queryByText(/nobody scanned in/)).not.toBeInTheDocument();
  });

  // The venue is paid in full and the host's share is nil — never taken back.
  it('explains a payout the venue bill swallowed rather than showing a negative', async () => {
    preview([previewMock({ waterfall: { ...waterfall, host_receives: -120 } })]);
    await settle();

    expect(screen.getByTestId('settlement-shortfall')).toBeInTheDocument();
  });

  it('leaves the shortfall note off a pod that paid its host', async () => {
    preview([previewMock()]);
    await settle();

    expect(screen.queryByTestId('settlement-shortfall')).not.toBeInTheDocument();
  });

  // Silently hiding the calculation would leave the host guessing.
  it('shows the server reason when the preview could not be computed', async () => {
    preview([
      {
        request: {
          query: POD_SETTLEMENT_PREVIEW,
          variables: { pod_id: 'pod-1', venue_bill_amount: 0 },
        },
        error: new Error('This pod has no completed payments yet'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    expect(screen.getByTestId('settlement-preview-error').textContent).toContain(
      'This pod has no completed payments yet',
    );
  });

  it('asks for a bill when there is nothing to compute from and nothing failed', async () => {
    preview([
      {
        request: {
          query: POD_SETTLEMENT_PREVIEW,
          variables: { pod_id: 'pod-1', venue_bill_amount: 0 },
        },
        result: { data: { podSettlementPreview: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    expect(screen.getByTestId('settlement-preview-error').textContent).toContain(
      'mweb.hostShare.previewHint',
    );
  });

  // A scanner session may have checked somebody in, and the settlement is
  // computed from exactly that.
  it('re-reads the figures after a scanner session', async () => {
    const { rerender } = preview([previewMock()]);
    await settle();

    rerender(
      <MockedProvider mocks={[previewMock({ attended_seats: 9 })]}>
        <ThemeProvider theme={testTheme}>
          <HostPodActionsProvider {...hostActionsConfig()}>
            <SettlementPreview podId="pod-1" venueBillAmount={0} onScan={vi.fn()} refreshToken={1} />
          </HostPodActionsProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    expect(screen.getByTestId('settlement-attendees')).toBeInTheDocument();
  });

  // Attendance is proof of arrival, so it is only ever created by scanning that
  // person's ticket — the row that has not been scanned carries the action.
  it('offers the scanner on the rows nobody has scanned yet', async () => {
    const onScan = vi.fn();
    preview(
      [
        previewMock({
          attendees: [attendee(), attendee({ membership_id: 'm-2', name: 'Vikram S', attended: false, attended_at: null })],
        }),
      ],
      { onScan },
    );
    await settle();
    expect(screen.getByText('Vikram S')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(onScan).toHaveBeenCalled();
  });
});

describe('PodMediaSummary', () => {
  it('shows what the pod already has rather than asking for it a second time', async () => {
    wrap(<PodMediaSummary podId="pod-1" />, [
      mediaBoardMock([
        {
          __typename: 'PodMediaItem',
          url: 'https://ik.imagekit.io/duncit/pod-media/a.jpg',
          type: 'IMAGE',
          source: 'HOST',
          uploaded_by_id: 'u-1',
          uploaded_by_name: 'Asha Rao',
          uploaded_at: '2026-08-30T14:00:00.000Z',
          mine: true,
          can_remove: true,
        },
      ]),
    ]);
    await settle();

    expect(screen.getByText(labels.podMedia)).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    // The Complete dialog shows the strip, it does not edit it.
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('offers the way to add more only where the surface owns that page', async () => {
    const onOpenPodMedia = vi.fn();
    const podMediaLabels = hostActionsConfig().podMediaLabels;
    wrap(<PodMediaSummary podId="pod-1" />, [mediaBoardMock()], { onOpenPodMedia });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: podMediaLabels.pageTitle }));
    expect(onOpenPodMedia).toHaveBeenCalledWith('pod-1');

    cleanup();
    wrap(<PodMediaSummary podId="pod-1" />, [mediaBoardMock()], { onOpenPodMedia: undefined });
    await settle();
    expect(screen.queryByRole('button', { name: podMediaLabels.pageTitle })).not.toBeInTheDocument();
  });
});

describe('PodCompleteDialog settlement', () => {
  const dialog = (
    pod: Record<string, unknown> | null,
    mocks: readonly MockedResponse[],
    over: Record<string, unknown> = {},
  ) => {
    const props = { pod, onClose: vi.fn(), onCompleted: vi.fn(), ...over };
    return { props, ...wrap(<PodCompleteDialog {...(props as never)} />, mocks) };
  };

  it('will not complete a venue pod until the bill is entered', async () => {
    const { props } = dialog(VENUE_POD, [previewMock(), mediaBoardMock()]);
    await settle();

    fireEvent.submit(document.querySelector('#pod-complete-form') as HTMLFormElement);
    await settle();
    await settle();

    expect(await screen.findByText(labels.venueBillRequired)).toBeInTheDocument();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('completes a pod with no venue behind it, with no bill to ask for', async () => {
    const { props } = dialog(POD, [
      previewMock(),
      mediaBoardMock(),
      {
        request: { query: COMPLETE_POD },
        variableMatcher: () => true,
        result: { data: { completePod: { __typename: 'Pod', id: 'pod-1' } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.completePod }));
    await settle();
    await settle();

    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('states the server reason rather than reporting a completion it never got', async () => {
    const { props } = dialog(POD, [
      previewMock(),
      mediaBoardMock(),
      {
        request: { query: COMPLETE_POD },
        variableMatcher: () => true,
        error: new Error('This pod has already been completed'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.completePod }));
    await settle();
    await settle();

    expect(screen.getByText('This pod has already been completed')).toBeInTheDocument();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('closes without completing anything', async () => {
    const { props } = dialog(POD, [previewMock(), mediaBoardMock()]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.cancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCompleted).not.toHaveBeenCalled();
  });
});
