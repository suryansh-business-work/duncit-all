import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { PodHistoryDetailsScreen } from '@/screens/PodHistoryDetailsScreen';
import { usePodBackout, usePodHistory, usePodInvoice, usePodTicket } from '@/hooks/usePodHistory';
import { usePolicy } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';
import type { PodMembership } from '@/utils/pod-history';

jest.mock('@/hooks/usePodHistory', () => ({
  usePodHistory: jest.fn(),
  usePodBackout: jest.fn(),
  usePodInvoice: jest.fn(),
  usePodTicket: jest.fn(),
}));
jest.mock('@/hooks/usePolicies', () => ({ usePolicy: jest.fn() }));
jest.mock('@/hooks/useProductOrders', () => ({
  useProductOrders: () => ({ orders: [], isLoading: false, error: undefined }),
}));
const mockNavigate = jest.fn();
let mockRouteParams: { membershipId: string } | undefined = { membershipId: 'm1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedHistory = usePodHistory as jest.Mock;
const mockedBackout = usePodBackout as jest.Mock;
const mockedInvoice = usePodInvoice as jest.Mock;
const mockedTicket = usePodTicket as jest.Mock;
const mockedPolicy = usePolicy as jest.Mock;

const pod = {
  id: 'pod1',
  pod_id: 'p1',
  club_slug: 'club',
  pod_title: 'Sunset Pod',
  pod_date_time: '2026-06-10T10:00:00Z',
  pod_end_date_time: null,
  pod_amount: 500,
  pod_type: 'NATIVE_PAID',
  no_of_spots: 4,
  pod_images_and_videos: [],
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
    pod,
    ...over,
  }) as unknown as PodMembership;

const backout = jest.fn();
const download = jest.fn();
const refetch = jest.fn();

function setHistory(over: Record<string, unknown> = {}) {
  mockedHistory.mockReturnValue({
    items: [membership()],
    isLoading: false,
    error: undefined,
    refetch,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { membershipId: 'm1' };
  backout.mockResolvedValue(undefined);
  download.mockResolvedValue(undefined);
  refetch.mockResolvedValue(undefined);
  mockedBackout.mockReturnValue({ backout, busy: false });
  mockedInvoice.mockReturnValue({ download, busy: false });
  mockedTicket.mockReturnValue({ download: jest.fn().mockResolvedValue(undefined), busy: false });
  mockedPolicy.mockReturnValue({
    isLoading: false,
    data: { policyBySlug: { content: '<p>terms</p>' } },
  });
  setHistory();
});

describe('PodHistoryDetailsScreen states', () => {
  it('shows a loader, error and not-found states', () => {
    setHistory({ items: [], isLoading: true });
    const { rerender } = renderWithProviders(<PodHistoryDetailsScreen />);
    expect(screen.getByTestId('pod-history-details-loading')).toBeOnTheScreen();

    setHistory({ items: [], isLoading: false, error: new Error('bad') });
    rerender(<PodHistoryDetailsScreen />);
    expect(screen.getByTestId('pod-history-details-error')).toHaveTextContent('bad');

    setHistory({ items: [membership({ id: 'other' })] });
    rerender(<PodHistoryDetailsScreen />);
    expect(screen.getByTestId('pod-history-details-missing')).toBeOnTheScreen();
  });
});

describe('PodHistoryDetailsScreen actions', () => {
  it('navigates to pod details, support and terms; opens general terms', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(<PodHistoryDetailsScreen />);

    fireEvent.press(screen.getByTestId('ph-pod-details'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'pod1', title: 'Sunset Pod' });

    fireEvent.press(screen.getByTestId('ph-support'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets', {
      podId: 'pod1',
      podTitle: 'Sunset Pod',
    });

    fireEvent.press(screen.getByTestId('ph-backout-terms'));
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'backout-terms' });

    fireEvent.press(screen.getByTestId('ph-general-terms'));
    expect(openURL).toHaveBeenCalledWith('https://duncit.com/terms');
  });

  it('shows the refund status as a notice', () => {
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-refund'));
    expect(screen.getByTestId('ph-notice')).toHaveTextContent('Refund status: Not started');
  });

  it('downloads the invoice and surfaces a failure as a notice', async () => {
    download.mockResolvedValueOnce(undefined);
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-invoice'));
    await waitFor(() => expect(download).toHaveBeenCalledWith('pay1'));

    download.mockRejectedValueOnce(new Error('no invoice'));
    fireEvent.press(screen.getByTestId('ph-invoice'));
    await waitFor(() => expect(screen.getByTestId('ph-notice')).toHaveTextContent('no invoice'));
  });

  it('confirms a backout and records the notice', async () => {
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    await waitFor(() => expect(backout).toHaveBeenCalledWith('pod1'));
    expect(refetch).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('ph-notice')).toHaveTextContent('Backout request recorded'),
    );
  });

  it('surfaces a backout failure as a notice', async () => {
    backout.mockRejectedValueOnce(new Error('cannot backout'));
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('ph-notice')).toHaveTextContent('cannot backout'),
    );
  });

  it('navigates to terms from the backout dialog view-terms link', () => {
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('backout-view-terms'));
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'backout-terms' });
  });

  it('closes the backout dialog via cancel', () => {
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('backout-cancel'));
    expect(screen.getByTestId('pod-history-details-screen')).toBeOnTheScreen();
  });

  it('ignores a backout confirmation when the pod has no id', () => {
    setHistory({ items: [membership({ pod: { ...pod, id: undefined } })] });
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-backout'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    expect(backout).not.toHaveBeenCalled();
  });

  it('downloads the ticket and surfaces a failure as a notice', async () => {
    const ticketDownload = jest.fn().mockResolvedValue(undefined);
    mockedTicket.mockReturnValue({ download: ticketDownload, busy: false });
    renderWithProviders(<PodHistoryDetailsScreen />);
    fireEvent.press(screen.getByTestId('ph-ticket'));
    await waitFor(() => expect(ticketDownload).toHaveBeenCalledWith('pod1'));

    ticketDownload.mockRejectedValueOnce(new Error('no ticket'));
    fireEvent.press(screen.getByTestId('ph-ticket'));
    await waitFor(() => expect(screen.getByTestId('ph-notice')).toHaveTextContent('no ticket'));
  });

  it('shows the not-found state when no membership id is in the route', () => {
    mockRouteParams = undefined;
    renderWithProviders(<PodHistoryDetailsScreen />);
    expect(screen.getByTestId('pod-history-details-missing')).toBeOnTheScreen();
  });
});
