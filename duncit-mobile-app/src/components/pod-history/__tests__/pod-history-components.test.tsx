import { fireEvent, screen } from '@testing-library/react-native';

import {
  BackoutConfirmDialog,
  PodHistoryActions,
  PodHistoryCard,
  PodHistoryDetails,
  PodHistoryTimeline,
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
  pod_type: 'NATIVE_PAID',
  no_of_spots: 4,
  pod_images_and_videos: [] as { url: string; type: string }[],
};

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
    pod: basePod,
    ...over,
  }) as unknown as PodMembership;

const handlers = () => ({
  onPodDetails: jest.fn(),
  onBackout: jest.fn(),
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
  it('shows the joined + available steps for a joined membership', () => {
    renderWithProviders(<PodHistoryTimeline item={membership()} />);
    expect(screen.getByText('Pod Joined')).toBeOnTheScreen();
    expect(screen.getByText('Available')).toBeOnTheScreen();
  });

  it('shows refund steps for a processed backout', () => {
    renderWithProviders(
      <PodHistoryTimeline
        item={membership({
          status: 'BACKED_OUT',
          backed_out_at: '2026-06-05',
          refund_status: 'PROCESSED',
        })}
      />,
    );
    expect(screen.getByText('Refund initiated')).toBeOnTheScreen();
  });
});

describe('PodHistoryActions', () => {
  it('fires each enabled action', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership()}
        backingOut={false}
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

  it('disables backout/invoice/pod-details appropriately', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryActions
        item={membership({ status: 'BACKED_OUT', pod: null, payment_id: null })}
        backingOut
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
});

describe('PodHistoryDetails', () => {
  it('renders joined chips, price and fires terms links', () => {
    const h = handlers();
    renderWithProviders(
      <PodHistoryDetails
        item={membership()}
        backingOut={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        {...h}
      />,
    );
    expect(screen.getByText('Joined')).toBeOnTheScreen();
    expect(screen.getByText('Paid pod ₹500')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ph-backout-terms'));
    fireEvent.press(screen.getByTestId('ph-general-terms'));
    expect(h.onBackoutTerms).toHaveBeenCalled();
    expect(h.onGeneralTerms).toHaveBeenCalled();
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
            pod_type: 'NATIVE_FREE',
          },
        })}
        backingOut={false}
        invoiceBusy={false}
        ticketBusy={false}
        notice="Refund status: Criteria pending"
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
        invoiceBusy={false}
        ticketBusy={false}
        notice={null}
        {...handlers()}
      />,
    );
    expect(screen.getByText('Date not available')).toBeOnTheScreen();
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
});
