import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { NotFoundScreen } from '@/screens/NotFoundScreen';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
const mockedNet = useNetworkStatus as jest.Mock;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

describe('OfflineBanner', () => {
  it('shows the warning only when offline', () => {
    mockedNet.mockReturnValue({ isOffline: false });
    const { rerender } = renderWithProviders(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();

    mockedNet.mockReturnValue({ isOffline: true });
    rerender(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeOnTheScreen();
    expect(screen.getByText('No internet connection')).toBeOnTheScreen();
  });
});

describe('NotFoundScreen', () => {
  it('renders 404 and navigates home', () => {
    renderWithProviders(<NotFoundScreen />);
    expect(screen.getByText('404')).toBeOnTheScreen();
    expect(screen.getByText('Page not found')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('not-found-home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Text>child content</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('child content')).toBeOnTheScreen();
  });

  it('catches a render error, shows the fallback and recovers on retry', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let crash = true;
    function Maybe() {
      if (crash) return <Boom />;
      return <Text>recovered</Text>;
    }
    renderWithProviders(<ErrorBoundary>{<Maybe />}</ErrorBoundary>);
    expect(screen.getByTestId('error-boundary-fallback')).toBeOnTheScreen();

    crash = false;
    fireEvent.press(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByText('recovered')).toBeOnTheScreen();
    spy.mockRestore();
  });
});
