import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RentablePodsList } from '@/components/shop/RentablePodsList';
import { RentablePodsDocument } from '@/graphql/rentals';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const pod = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pod_id: `DP-${id}`,
  club_id: 'c1',
  pod_title: `Pod ${id}`,
  pod_date_time: '2026-11-01T10:00:00.000Z',
  cover_url: '',
  venue_name: 'Court Nine',
  item_count: 3,
  from_rate: 50,
  currency_symbol: '₹',
  ...over,
});

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockReset();
});

describe('RentablePodsList', () => {
  it('lists upcoming pods that rent things out, with the venue and the cheapest rate', async () => {
    mockRequest.mockResolvedValue({ rentablePods: [pod('p1'), pod('p2', { venue_name: '' })] });
    renderWithProviders(<RentablePodsList />);

    await waitFor(() => expect(screen.getByTestId('shop-rent-list')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(RentablePodsDocument, {});
    expect(screen.getByText('Pod p1')).toBeOnTheScreen();
    expect(screen.getByText(/· Court Nine$/)).toBeOnTheScreen();
    expect(screen.getAllByText(/3 items to rent, from ₹\s?50/)).toHaveLength(2);
  });

  it('opens the pod’s details, where the items are rented, on a tap', async () => {
    mockRequest.mockResolvedValue({ rentablePods: [pod('p1')] });
    renderWithProviders(<RentablePodsList />);

    await waitFor(() => expect(screen.getByTestId('shop-rent-pod-p1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('shop-rent-pod-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Pod p1' });
  });

  it('says there is nothing to rent when no upcoming pod rents anything', async () => {
    mockRequest.mockResolvedValue({ rentablePods: [] });
    renderWithProviders(<RentablePodsList />);
    await waitFor(() => expect(screen.getByTestId('shop-rent-empty')).toBeOnTheScreen());
  });

  it('says the list could not load, and Retry loads it', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<RentablePodsList />);
    await waitFor(() =>
      expect(screen.getByTestId('shop-rent-error')).toHaveTextContent(
        'The rented items could not load',
      ),
    );

    mockRequest.mockResolvedValue({ rentablePods: [pod('p1')] });
    fireEvent.press(screen.getByTestId('shop-rent-error-retry'));
    await waitFor(() => expect(screen.getByTestId('shop-rent-list')).toBeOnTheScreen());
  });

  it('keeps the error up, without crashing, when the retry fails too', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<RentablePodsList />);
    await waitFor(() => expect(screen.getByTestId('shop-rent-error')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('shop-rent-error-retry'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('shop-rent-error')).toBeOnTheScreen();
  });
});
