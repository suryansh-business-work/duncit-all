import { screen } from '@testing-library/react-native';

import { BookingScreen } from '@/screens/BookingScreen';
import { useBookingDetail } from '@/hooks/useBookingDetail';
import { renderWithProviders } from '@/utils/test-utils';

const mockReplace = jest.fn();
let mockRouteParams: { bookingId: string } | undefined = { bookingId: 'bk-1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('@/hooks/useBookingDetail', () => ({ useBookingDetail: jest.fn() }));
const mockedUse = useBookingDetail as jest.Mock;

const booking = {
  id: 'bk-1',
  pod_id: 'pod-doc-1',
  club_slug: 'sunset-club',
  pod_slug: 'rooftop-jam',
  pod_title: 'Sunset Rooftop Jam',
  pod_date_time: '2026-08-12T12:30:00.000Z',
  status: 'JOINED',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { bookingId: 'bk-1' };
});

describe('BookingScreen (mWeb BookingPage twin, rule 27)', () => {
  it('shows the spinner while the booking resolves', () => {
    mockedUse.mockReturnValue({ booking: null, isLoading: true, error: undefined });
    renderWithProviders(<BookingScreen />);
    expect(mockedUse).toHaveBeenCalledWith('bk-1');
    expect(screen.getByTestId('booking-loading')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces itself with the pod detail once the booking resolves', () => {
    mockedUse.mockReturnValue({ booking, isLoading: false, error: undefined });
    renderWithProviders(<BookingScreen />);
    expect(mockReplace).toHaveBeenCalledWith('PodDetails', {
      clubSlug: 'sunset-club',
      podSlug: 'rooftop-jam',
      title: 'Sunset Rooftop Jam',
    });
    expect(screen.getByTestId('booking-loading')).toBeOnTheScreen();
  });

  it('surfaces the server ownership rejection', () => {
    mockedUse.mockReturnValue({
      booking: null,
      isLoading: false,
      error: new Error('You are not authorized to view this booking.'),
    });
    renderWithProviders(<BookingScreen />);
    expect(screen.getByTestId('booking-error')).toHaveTextContent(
      'You are not authorized to view this booking.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to a not-found message when there is no booking and no error', () => {
    mockRouteParams = undefined;
    mockedUse.mockReturnValue({ booking: null, isLoading: false, error: undefined });
    renderWithProviders(<BookingScreen />);
    expect(mockedUse).toHaveBeenCalledWith('');
    expect(screen.getByTestId('booking-error')).toHaveTextContent(
      'This booking could not be found.',
    );
  });
});
