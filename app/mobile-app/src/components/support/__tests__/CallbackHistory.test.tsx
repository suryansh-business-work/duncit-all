import { screen, waitFor } from '@testing-library/react-native';

import { CallbackHistory } from '@/components/support/CallbackHistory';
import { useBouncer } from '@/hooks/useBouncer';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBouncer', () => ({ useBouncer: jest.fn() }));
const mockedBouncer = useBouncer as jest.Mock;
const listMyCallbacks = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedBouncer.mockReturnValue({ listMyCallbacks });
});

describe('CallbackHistory', () => {
  it('renders nothing when there are no callbacks', async () => {
    listMyCallbacks.mockResolvedValue([]);
    renderWithProviders(<CallbackHistory />);
    await waitFor(() => expect(listMyCallbacks).toHaveBeenCalled());
    expect(screen.queryByTestId('callback-history')).toBeNull();
  });

  it('renders rows with date, duration, conclusion and status', async () => {
    listMyCallbacks.mockResolvedValue([
      {
        id: 'c1',
        reason: 'Booking issue',
        status: 'CONTACTED',
        contacted_at: '2026-06-01T10:00:00Z',
        duration_seconds: 142,
        conclusion: 'Resolved on call',
        created_at: '2026-06-01T09:00:00Z',
      },
      {
        id: 'c2',
        reason: '',
        status: 'UNKNOWN',
        contacted_at: null,
        duration_seconds: null,
        conclusion: '',
        created_at: '2026-06-02T09:00:00Z',
      },
      {
        // Block shows via contacted_at; duration + conclusion absent.
        id: 'c3',
        reason: 'Just contacted',
        status: 'PENDING',
        contacted_at: '2026-06-03T10:00:00Z',
        duration_seconds: null,
        conclusion: '',
        created_at: '2026-06-03T09:00:00Z',
      },
      {
        // Block shows via duration; contacted_at absent.
        id: 'c4',
        reason: '',
        status: 'CLOSED',
        contacted_at: null,
        duration_seconds: 30,
        conclusion: '',
        created_at: '2026-06-04T09:00:00Z',
      },
    ]);
    renderWithProviders(<CallbackHistory refreshKey={1} />);
    await waitFor(() => expect(screen.getByTestId('callback-history')).toBeOnTheScreen());
    expect(screen.getByTestId('callback-c1')).toBeOnTheScreen();
    expect(screen.getByText('Booking issue')).toBeOnTheScreen();
    expect(screen.getByText(/2m 22s/)).toBeOnTheScreen();
    expect(screen.getByTestId('callback-c2')).toBeOnTheScreen();
  });

  it('swallows a load failure', async () => {
    listMyCallbacks.mockRejectedValue(new Error('offline'));
    renderWithProviders(<CallbackHistory />);
    await waitFor(() => expect(listMyCallbacks).toHaveBeenCalled());
    expect(screen.queryByTestId('callback-history')).toBeNull();
  });
});
