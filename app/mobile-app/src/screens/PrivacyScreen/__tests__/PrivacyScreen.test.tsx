import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { useDataExport } from '@/hooks/useDataExport';
import { useConsentStore } from '@/stores/consent.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDataExport', () => ({ useDataExport: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));
const mockLogError = jest.fn();
jest.mock('@duncit/logs', () => ({
  // config.ts logs its API origin with .info at import time.
  logs: {
    mobileApp: {
      error: (...args: unknown[]) => mockLogError(...args),
      info: jest.fn(),
      warn: jest.fn(),
    },
  },
}));

const mockedExport = useDataExport as jest.Mock;
const download = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedExport.mockReturnValue({ download, busy: false });
  useConsentStore.setState({ hydrated: true, choice: null });
});

describe('PrivacyScreen', () => {
  it('renders both cards under the screen title', () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByTestId('privacy-page')).toBeOnTheScreen();
    expect(screen.getByTestId('privacy-tracking-card')).toBeOnTheScreen();
    expect(screen.getByTestId('privacy-data-card')).toBeOnTheScreen();
    expect(screen.getByText('Download my data')).toBeOnTheScreen();
  });

  it('shows both switches off while nothing is allowed, and saves a change at once', () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByTestId('consent-switch-analytics-switch').props.value).toBe(false);
    expect(screen.queryByTestId('privacy-tracking-saved')).toBeNull();
    fireEvent(screen.getByTestId('consent-switch-analytics-switch'), 'valueChange', true);
    expect(useConsentStore.getState().choice).toMatchObject({ analytics: true, marketing: false });
    expect(screen.getByTestId('privacy-tracking-saved')).toBeOnTheScreen();
  });

  it('reflects a stored choice and withdraws one category without touching the other', () => {
    useConsentStore.setState({
      choice: { analytics: true, marketing: true, decided_at: '2026-10-01T00:00:00.000Z' },
    });
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByTestId('consent-switch-marketing-switch').props.value).toBe(true);
    fireEvent(screen.getByTestId('consent-switch-marketing-switch'), 'valueChange', false);
    expect(useConsentStore.getState().choice).toMatchObject({ analytics: true, marketing: false });
  });

  it('says the file is ready once it is shared', async () => {
    download.mockResolvedValue(undefined);
    renderWithProviders(<PrivacyScreen />);
    fireEvent.press(screen.getByTestId('privacy-download-data'));
    expect(await screen.findByTestId('privacy-download-done')).toBeOnTheScreen();
    expect(screen.queryByTestId('privacy-download-error')).toBeNull();
  });

  it('says the file could not be prepared, and logs why', async () => {
    download.mockRejectedValue(new Error('offline'));
    renderWithProviders(<PrivacyScreen />);
    fireEvent.press(screen.getByTestId('privacy-download-data'));
    expect(await screen.findByTestId('privacy-download-error')).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith(
        'PrivacyScreen',
        'DataExportCard',
        expect.anything(),
      ),
    );
  });

  it('shows the in-progress label while the file is prepared', () => {
    mockedExport.mockReturnValue({ download, busy: true });
    renderWithProviders(<PrivacyScreen />);
    // The button spins; its accessible name says what is happening.
    expect(screen.getByLabelText('Preparing your file…')).toBeOnTheScreen();
  });
});
