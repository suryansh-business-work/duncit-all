import { fireEvent, screen } from '@testing-library/react-native';

import {
  BackoutConfirmDialog,
  KeepSpotDialog,
  PodHistoryActions,
  PodHistoryCard,
  PodHistoryDetails,
  PodHistoryTimeline,
  RejoinConfirmDialog,
  ReplacementNotice,
} from '@/components/pod-history';
import { usePolicy } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';
import type { PodMembership } from '@/utils/pod-history';

jest.mock('@/hooks/usePolicies', () => ({ usePolicy: jest.fn() }));
const mockedUsePolicy = usePolicy as jest.Mock;

const basePod = {
  id: 'pod1',
  pod_id: 'p1',
  club_slug: 'club',
  pod_title: 'Sunset Pod',
  pod_date_time: '2026-06-10T10:00:00Z',
  pod_end_date_time: null,
  pod_amount: 500,
  pod_type: 'PAID',
  no_of_spots: 4,
  pod_images_and_videos: [] as { url: string; type: string }[],
};

// A pod far in the future is "active" (rejoinable); one far in the past has ended.
const futurePod = { ...basePod, pod_date_time: '2999-01-01T10:00:00Z', pod_end_date_time: null };
const endedPod = { ...basePod, pod_date_time: '2000-01-01T10:00:00Z', pod_end_date_time: null };

const membership = (over: Record<string, unknown> = {}): PodMembership =>
  ({
    id: 'm1',
    pod_id: 'p1',
    status: 'JOINED',
    joined_at: '2026-06-01T10:00:00Z',
    backed_out_at: null,
    payment_id: 'pay1',
    refund_status: 'NONE',
    refund_payment_id: null,
    referral_token: null,
    source: 'DIRECT',
    // A pod that has not happened yet: what a booking may still be offered now
    // depends on the date, so the default fixture pins one rather than drifting
    // into the past as the calendar moves.
    pod: futurePod,
    ...over,
  }) as unknown as PodMembership;

const handlers = () => ({
  onPodDetails: jest.fn(),
  onBackout: jest.fn(),
  onRejoin: jest.fn(),
  onRefundStatus: jest.fn(),
  onInvoice: jest.fn(),
  onTicket: jest.fn(),
  onSupport: jest.fn(),
  onBackoutTerms: jest.fn(),
  onGeneralTerms: jest.fn(),
});

beforeEach(() =>
  mockedUsePolicy.mockReset().mockReturnValue({ isLoading: false, data: undefined }),
);

describe('PodHistoryCard', () => {
  it('renders title + joined date and fires onPress (no image)', () => {
    const onPress = jest.fn();
    renderWithProviders(<PodHistoryCard item={membership()} onPress={onPress} />);
    expect(screen.getByText('Sunset Pod')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-history-card-m1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders the pod image and a fallback title when pod is missing', () => {
    renderWithProviders(
      <PodHistoryCard
        item={membership({
          pod: { ...basePod, pod_images_and_videos: [{ url: 'http://i', type: 'IMAGE' }] },
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Sunset Pod')).toBeOnTheScreen();
    renderWithProviders(<PodHistoryCard item={membership({ pod: null })} onPress={jest.fn()} />);
    expect(screen.getAllByText('Pod').length).toBeGreaterThan(0);
  });
});

describe('PodHistoryTimeline', () => {
  const future = '2999-01-01T10:00:00Z';
  const past = '2020-01-01T10:00:00Z';
  const withDate = (date: string, over: Record<string, unknown> = {}) =>
    membership({ pod: { ...membership().pod!, pod_date_time: date }, ...over });
  const backout = (over: Record<string, unknown> = {}) => ({
    backout_no: 'DUN-BKO-7',
    status: 'SPOT_FILLED',
    attempt_no: 1,
    seats: 1,
    seats_before: 1,
    refund_amount: 500,
    deduction_pct: 10,
    refund_processed_at: '2026-06-06',
    created_at: '2026-06-05',
    events: [],
    ...over,
  });

  it('says nothing about a refund nobody asked for', () => {
    renderWithProviders(<PodHistoryTimeline item={withDate(future)} />);
    expect(screen.getByText('Pod Joined')).toBeOnTheScreen();
    expect(screen.queryByText('Refund Initiated')).toBeNull();
  });

  it('records attendance once the pod has happened', () => {
    renderWithProviders(<PodHistoryTimeline item={withDate(past, { attended: true })} />);
    expect(screen.getByText('Pod Attended')).toBeOnTheScreen();
  });

  it('carries the backout id and its refund on the branch it belongs to', () => {
    renderWithProviders(<PodHistoryTimeline item={withDate(future, { backouts: [backout()] })} />);
    expect(screen.getByText('Pod Backout Requested')).toBeOnTheScreen();
    expect(screen.getByText('DUN-BKO-7')).toBeOnTheScreen();
    expect(screen.getByText('Spot Filled')).toBeOnTheScreen();
    expect(screen.getByText('Refund Initiated')).toBeOnTheScreen();
  });

  it('says how many seats a partial backout gave up', () => {
    renderWithProviders(
      <PodHistoryTimeline
        item={withDate(future, { backouts: [backout({ seats: 1, seats_before: 3 })] })}
      />,
    );
    expect(screen.getByText('Partial Backout Requested')).toBeOnTheScreen();
    expect(screen.getByText('You released 1 of 3 seats and kept 2.')).toBeOnTheScreen();
  });

  it('marks a backout that is still being worked on as in progress', () => {
    renderWithProviders(
      <PodHistoryTimeline
        item={withDate(future, {
          backouts: [
            backout({ status: 'IN_PROCESS', refund_amount: 0, refund_processed_at: null }),
          ],
        })}
      />,
    );
    expect(screen.getByText('In progress')).toBeOnTheScreen();
  });

  it('names who cancelled the pod and stops there', () => {
    renderWithProviders(
      <PodHistoryTimeline
        item={withDate(future, { pod_cancelled_by: 'HOST', pod_cancelled_at: '2026-06-05' })}
      />,
    );
    expect(screen.getByText('Pod Cancelled')).toBeOnTheScreen();
    expect(screen.getByText('The pod was cancelled by the host.')).toBeOnTheScreen();
  });
});

describe('PodHistoryActions', () => {
  it('fires each enabled action', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        // Refund Status is only offered to someone who asked for a refund, so the
        // booking that offers every button is one with a backout on it.
        item={membership({ backouts: [{ refund_amount: 500, seats: 1, seats_before: 1 }] })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        {...h}
      />,
    );
    fireEvent.press(screen.getByTestId('ph-pod-details'));
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('ph-refund'));
    fireEvent.press(screen.getByTestId('ph-invoice'));
    fireEvent.press(screen.getByTestId('ph-ticket'));
    fireEvent.press(screen.getByTestId('ph-support'));
    expect(h.onPodDetails).toHaveBeenCalled();
    expect(h.onBackout).toHaveBeenCalled();
    expect(h.onRefundStatus).toHaveBeenCalled();
    expect(h.onInvoice).toHaveBeenCalled();
    expect(h.onTicket).toHaveBeenCalled();
    expect(h.onSupport).toHaveBeenCalled();
  });

  it('shows only Invoice + Support for a soft-deleted pod', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership({ pod: { ...basePod, is_deleted: true } })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        {...h}
      />,
    );
    expect(screen.queryByTestId('ph-pod-details')).toBeNull();
    expect(screen.queryByTestId('ph-backout')).toBeNull();
    expect(screen.queryByTestId('ph-rejoin')).toBeNull();
    expect(screen.queryByTestId('ph-refund')).toBeNull();
    expect(screen.queryByTestId('ph-ticket')).toBeNull();
    fireEvent.press(screen.getByTestId('ph-invoice'));
    fireEvent.press(screen.getByTestId('ph-support'));
    expect(h.onInvoice).toHaveBeenCalled();
    expect(h.onSupport).toHaveBeenCalled();
  });

  it('disables backout/invoice/pod-details appropriately', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership({ status: 'BACKED_OUT', pod: null, payment_id: null })}
        backingOut
        rejoining={false}
        invoiceBusy
        ticketBusy={false}
        {...h}
      />,
    );
    fireEvent.press(screen.getByTestId('ph-pod-details'));
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('ph-invoice'));
    expect(h.onPodDetails).not.toHaveBeenCalled();
    expect(h.onBackout).not.toHaveBeenCalled();
    expect(h.onInvoice).not.toHaveBeenCalled();
    expect(screen.getByText('Backing out…')).toBeOnTheScreen();
    expect(screen.getByText('Downloading…')).toBeOnTheScreen();
  });

  it('shows Rejoin for an active backed-out pod and fires onRejoin', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership({ status: 'BACKED_OUT', pod: futurePod })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        {...h}
      />,
    );
    fireEvent.press(screen.getByTestId('ph-rejoin'));
    expect(h.onRejoin).toHaveBeenCalled();
  });

  it('hides Rejoin for a joined membership', () => {
    renderWithProviders(
      <PodHistoryActions
        item={membership({ pod: futurePod })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        {...handlers()}
      />,
    );
    expect(screen.queryByTestId('ph-rejoin')).toBeNull();
  });

  it('hides Rejoin once the pod has ended', () => {
    renderWithProviders(
      <PodHistoryActions
        item={membership({ status: 'BACKED_OUT', pod: endedPod })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        {...handlers()}
      />,
    );
    expect(screen.queryByTestId('ph-rejoin')).toBeNull();
  });

  it('disables Rejoin and shows a busy label while rejoining', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership({ status: 'BACKED_OUT', pod: futurePod })}
        backingOut={false}
        rejoining
        invoiceBusy={false}
        ticketBusy={false}
        {...h}
      />,
    );
    expect(screen.getByText('Rejoining…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ph-rejoin'));
    expect(h.onRejoin).not.toHaveBeenCalled();
  });
});

describe('PodHistoryDetails', () => {
  it('renders joined chips, price and fires terms links', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryDetails
        item={membership()}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        deductionPct={0}
        {...h}
      />,
    );
    expect(screen.getByText('Joined')).toBeOnTheScreen();
    expect(screen.getByText('Paid pod ₹500')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ph-backout-terms'));
    fireEvent.press(screen.getByTestId('ph-general-terms'));
    expect(h.onBackoutTerms).toHaveBeenCalled();
    expect(h.onGeneralTerms).toHaveBeenCalled();
    expect(screen.queryByText('Refund: Not started')).toBeNull();
  });

  it('says Visited once the pod has happened, and reports a refund that was asked for', () => {
    renderWithProviders(
      <PodHistoryDetails
        item={membership({
          pod: endedPod,
          backouts: [{ refund_amount: 500, seats: 1, seats_before: 1 }],
        })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        deductionPct={0}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Visited')).toBeOnTheScreen();
    // The chip; the actions row carries the same label on its Refund button.
    expect(screen.getAllByText('Refund: Not started').length).toBeGreaterThan(0);
  });

  it('shows the pending refund alert + notice for a backed-out membership', () => {
    renderWithProviders(
      <PodHistoryDetails
        item={membership({
          status: 'BACKED_OUT',
          refund_status: 'PENDING',
          pod: {
            ...basePod,
            pod_images_and_videos: [{ url: 'http://i', type: 'IMAGE' }],
            pod_type: 'FREE',
          },
        })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice="Refund status: Criteria pending"
        deductionPct={0}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Backed out')).toBeOnTheScreen();
    expect(screen.getByText('Free pod')).toBeOnTheScreen();
    expect(screen.getByTestId('ph-refund-pending')).toBeOnTheScreen();
    expect(screen.getByTestId('ph-notice')).toHaveTextContent('Refund status: Criteria pending');
  });

  it('handles a missing pod date and pod object', () => {
    renderWithProviders(
      <PodHistoryDetails
        item={membership({ pod: null })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        deductionPct={0}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Date not available')).toBeOnTheScreen();
  });

  it('shows the replacement notice with a toggleable deduction when rejoin is available', () => {
    renderWithProviders(
      <PodHistoryDetails
        item={membership({ status: 'BACKED_OUT', pod: futurePod })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        deductionPct={15}
        {...handlers()}
      />,
    );
    expect(screen.getByTestId('ph-replacement')).toBeOnTheScreen();
    expect(screen.queryByTestId('ph-replacement-detail')).toBeNull();
    fireEvent.press(screen.getByTestId('ph-replacement-info'));
    expect(screen.getByTestId('ph-replacement-detail')).toHaveTextContent(/15% deduction/);
  });

  it('labels an in-process backout and keeps the replacement notice visible', () => {
    renderWithProviders(
      <PodHistoryDetails
        item={membership({ status: 'BACKOUT_IN_PROCESS', pod: endedPod })}
        backingOut={false}
        rejoining={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        deductionPct={10}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Backout in process')).toBeOnTheScreen();
    // Even for an ended pod (no rejoin) the in-process state shows the notice.
    expect(screen.getByTestId('ph-replacement')).toBeOnTheScreen();
  });
});

describe('ReplacementNotice', () => {
  it('toggles the detail and clamps a high percentage', () => {
    renderWithProviders(<ReplacementNotice deductionPct={150} />);
    expect(screen.getByText('We are finding your replacement')).toBeOnTheScreen();
    expect(screen.queryByTestId('ph-replacement-detail')).toBeNull();
    fireEvent.press(screen.getByTestId('ph-replacement-info'));
    expect(screen.getByTestId('ph-replacement-detail')).toHaveTextContent(/100% deduction/);
    fireEvent.press(screen.getByTestId('ph-replacement-info'));
    expect(screen.queryByTestId('ph-replacement-detail')).toBeNull();
  });

  it('clamps a negative percentage and defaults non-numeric to 0', () => {
    const { rerender } = renderWithProviders(<ReplacementNotice deductionPct={-5} />);
    fireEvent.press(screen.getByTestId('ph-replacement-info'));
    expect(screen.getByTestId('ph-replacement-detail')).toHaveTextContent(/0% deduction/);
    rerender(<ReplacementNotice deductionPct={NaN} />);
    expect(screen.getByTestId('ph-replacement-detail')).toHaveTextContent(/0% deduction/);
  });
});

describe('BackoutConfirmDialog', () => {
  const dlg = () => ({ onClose: jest.fn(), onConfirm: jest.fn(), onViewTerms: jest.fn() });

  it('does not render its body when closed', () => {
    renderWithProviders(<BackoutConfirmDialog open={false} busy={false} {...dlg()} />);
    expect(screen.queryByTestId('backout-confirm')).toBeNull();
  });

  it('shows a loader while the policy loads', () => {
    mockedUsePolicy.mockReturnValue({ isLoading: true, data: undefined });
    renderWithProviders(<BackoutConfirmDialog open busy={false} {...dlg()} />);
    expect(screen.getByTestId('backout-terms-loading')).toBeOnTheScreen();
  });

  it('renders policy terms and confirms / cancels / views terms', () => {
    mockedUsePolicy.mockReturnValue({
      isLoading: false,
      data: { policyBySlug: { content: '<p>No refunds</p>' } },
    });
    const h = dlg();
    renderWithProviders(<BackoutConfirmDialog open busy={false} {...h} />);
    expect(screen.getByText('No refunds')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('backout-view-terms'));
    fireEvent.press(screen.getByTestId('backout-cancel'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    expect(h.onViewTerms).toHaveBeenCalled();
    expect(h.onClose).toHaveBeenCalled();
    expect(h.onConfirm).toHaveBeenCalled();
  });

  it('blocks actions and shows a spinner while busy', () => {
    mockedUsePolicy.mockReturnValue({ isLoading: false, data: { policyBySlug: { content: '' } } });
    const h = dlg();
    renderWithProviders(<BackoutConfirmDialog open busy {...h} />);
    expect(screen.getByText('Backing out…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('backout-confirm'));
    fireEvent.press(screen.getByTestId('backout-cancel'));
    expect(h.onConfirm).not.toHaveBeenCalled();
    expect(h.onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Review the backout terms before confirming.')).toBeOnTheScreen();
  });

  it('shows the refund estimate for a paid booking and hides it for free ones', () => {
    renderWithProviders(
      <BackoutConfirmDialog open busy={false} refundAmount={450} deductionPct={10} {...dlg()} />,
    );
    expect(screen.getByTestId('backout-refund-amount')).toHaveTextContent(/₹450/);
    expect(screen.getByTestId('backout-refund-amount')).toHaveTextContent(/10%/);

    renderWithProviders(<BackoutConfirmDialog open busy={false} refundAmount={null} {...dlg()} />);
    expect(
      screen.getAllByText('You will get the refund only if someone fills your spot.').length,
    ).toBeGreaterThan(0);
  });
});

describe('KeepSpotDialog', () => {
  const dlg = () => ({ onClose: jest.fn(), onConfirm: jest.fn() });

  it('does not render its body when closed', () => {
    renderWithProviders(<KeepSpotDialog open={false} busy={false} attemptsLeft={2} {...dlg()} />);
    expect(screen.queryByTestId('keep-spot-confirm')).toBeNull();
  });

  it('shows the attempts-left note and confirms / closes when idle', () => {
    const h = dlg();
    renderWithProviders(<KeepSpotDialog open busy={false} attemptsLeft={2} {...h} />);
    expect(screen.getByText(/up to 2 more times/)).toBeOnTheScreen();
    expect(screen.queryByTestId('keep-spot-error')).toBeNull();
    fireEvent.press(screen.getByTestId('keep-spot-close'));
    fireEvent.press(screen.getByTestId('keep-spot-cancel'));
    fireEvent.press(screen.getByTestId('keep-spot-confirm'));
    expect(h.onClose).toHaveBeenCalledTimes(2);
    expect(h.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('surfaces a server error inside the sheet', () => {
    renderWithProviders(
      <KeepSpotDialog
        open
        busy={false}
        attemptsLeft={0}
        error="A replacement has been confirmed"
        {...dlg()}
      />,
    );
    expect(screen.getByTestId('keep-spot-error')).toHaveTextContent(
      'A replacement has been confirmed',
    );
  });

  it('blocks actions and shows a spinner while busy', () => {
    const h = dlg();
    renderWithProviders(<KeepSpotDialog open busy attemptsLeft={1} {...h} />);
    expect(screen.getByText('Restoring…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('keep-spot-confirm'));
    fireEvent.press(screen.getByTestId('keep-spot-cancel'));
    fireEvent.press(screen.getByTestId('keep-spot-close'));
    expect(h.onConfirm).not.toHaveBeenCalled();
    expect(h.onClose).not.toHaveBeenCalled();
  });
});

describe('RejoinConfirmDialog', () => {
  const dlg = () => ({ onClose: jest.fn(), onConfirm: jest.fn() });

  it('does not render its body when closed', () => {
    renderWithProviders(<RejoinConfirmDialog open={false} busy={false} {...dlg()} />);
    expect(screen.queryByTestId('rejoin-confirm')).toBeNull();
  });

  it('confirms / cancels / closes when open and idle', () => {
    const h = dlg();
    renderWithProviders(<RejoinConfirmDialog open busy={false} {...h} />);
    expect(screen.getByText('Rejoin for free')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rejoin-close'));
    fireEvent.press(screen.getByTestId('rejoin-cancel'));
    fireEvent.press(screen.getByTestId('rejoin-confirm'));
    expect(h.onClose).toHaveBeenCalledTimes(2);
    expect(h.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks actions and shows a spinner while busy', () => {
    const h = dlg();
    renderWithProviders(<RejoinConfirmDialog open busy {...h} />);
    expect(screen.getByText('Rejoining…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rejoin-confirm'));
    fireEvent.press(screen.getByTestId('rejoin-cancel'));
    fireEvent.press(screen.getByTestId('rejoin-close'));
    expect(h.onConfirm).not.toHaveBeenCalled();
    expect(h.onClose).not.toHaveBeenCalled();
  });
});
