import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { navigationRef } from '@/navigation/navigationRef';
import { screenLayout } from '@/navigation/screenLayout';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useFeedback', () => ({ submitAppFeedback: jest.fn() }));
jest.mock('@/navigation/navigationRef', () => ({ navigationRef: { getCurrentRoute: jest.fn() } }));

const submit = submitAppFeedback as jest.Mock;
const currentRoute = navigationRef.getCurrentRoute as jest.Mock;

function Crash(): never {
  throw new Error('Cannot read wallet balance for ravi.plays@duncit.com');
}

let error: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  submit.mockResolvedValue(undefined);
  currentRoute.mockReturnValue({ name: 'PodDetails' });
  useAuthStore.setState({ token: null });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  error = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
  warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

const reportedRows = () =>
  warn.mock.calls.filter(([, , detail]) => (detail as { event: string }).event === 'REPORTED');

describe('native ErrorBoundary', () => {
  it('logs a scrubbed CAUGHT row for the screen it wraps, announces itself and shows a reference', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    renderWithProviders(screenLayout({ children: <Crash />, route: { name: 'Wallet' } }));

    expect(screen.getByTestId('error-boundary-fallback')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Something went wrong');
    expect(error).toHaveBeenCalledTimes(1);
    const [route, component, detail] = error.mock.calls[0];
    expect(route).toBe('Wallet');
    expect(component).toBe('errorBoundary');
    expect(detail).toMatchObject({ event: 'CAUGHT', scope: 'page', surface: 'mobileApp' });
    expect((detail.error as Error).message).toBe('Cannot read wallet balance for [email]');
    expect(screen.getByText(/^Reference: /)).toBeOnTheScreen();
  });

  it('reads the focused route at the root, where it wraps no single screen', () => {
    renderWithProviders(
      <ErrorBoundary scope="root">
        <Crash />
      </ErrorBoundary>,
    );
    expect(error).toHaveBeenCalledWith(
      'PodDetails',
      'errorBoundary',
      expect.objectContaining({ event: 'CAUGHT', scope: 'root' }),
    );
  });

  it('files feedback for a signed-in member, and logs the report once across a failed send', async () => {
    useAuthStore.setState({ token: 'session-jwt' });
    submit.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(screenLayout({ children: <Crash />, route: { name: 'Wallet' } }));

    fireEvent.press(screen.getByTestId('error-boundary-report'));
    expect(
      await screen.findByText('The report could not be sent. Try again in a moment.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('error-boundary-report'));
    expect(await screen.findByText('Thanks — the report reached our team.')).toBeOnTheScreen();

    expect(submit).toHaveBeenCalledTimes(2);
    const [category, message, media, sourceScreen] = submit.mock.calls[0];
    expect(category).toBe('BUG');
    expect(message).toContain('Cannot read wallet balance for [email]');
    expect(media).toEqual([]);
    expect(sourceScreen).toBe('Wallet');
    expect(reportedRows()).toHaveLength(1);
    expect(screen.queryByTestId('error-boundary-report')).toBeNull();
  });

  it('reports a signed-out crash through its log row alone', async () => {
    renderWithProviders(screenLayout({ children: <Crash />, route: { name: 'Wallet' } }));
    fireEvent.press(screen.getByTestId('error-boundary-report'));
    expect(await screen.findByText('Thanks — the report reached our team.')).toBeOnTheScreen();
    expect(submit).not.toHaveBeenCalled();
    expect(reportedRows()).toHaveLength(1);
  });
});
