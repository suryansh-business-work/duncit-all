import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';
import { useThemeStore } from '@/stores/theme.store';
import { appVersion } from '@/utils/app-version';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/utils/app-version', () => ({ appVersion: jest.fn(() => '1.0.0') }));
const mockedAppVersion = appVersion as jest.Mock;

// The gate's flag lookup triggers the one-shot flags fetch. Every test drives
// the store directly, so the request must never resolve behind their backs.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));

const setVersionInfo = (latest: string, androidUrl: string) =>
  useAppVersionStore.setState({
    data: {
      appVersionInfo: {
        latest_version: latest,
        android_store_url: androidUrl,
        ios_store_url: '',
      },
    },
  });

/** Seeds the server's public flag set — `undefined` leaves it still loading. */
const setForceUpdateFlag = (enabled: boolean | undefined) =>
  useFeatureFlagsStore.setState({
    data:
      enabled === undefined
        ? undefined
        : { publicFeatureFlags: [{ key: 'force_app_update', enabled }] },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedAppVersion.mockReturnValue('1.0.0');
  useAppVersionStore.setState({ data: undefined, isLoading: false, error: undefined });
  useFeatureFlagsStore.setState({ data: undefined, isLoading: false, error: undefined });
  // The flag ships ON, so the existing behaviour is what most tests assert.
  setForceUpdateFlag(true);
  useThemeStore.setState({ scheme: 'light' });
});

describe('ForceUpdateGate', () => {
  it('blocks with a store CTA when the build is behind the latest', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    setVersionInfo('2.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);

    expect(screen.getByTestId('force-update-gate')).toBeOnTheScreen();
    expect(screen.getByTestId('force-update-title')).toBeOnTheScreen();
    expect(screen.getByTestId('force-update-versions')).toHaveTextContent(
      'Current v1.0.0 · Latest v2.0.0',
    );

    fireEvent.press(screen.getByTestId('force-update-cta'));
    expect(openURL).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.duncit.mobile',
    );
  });

  it('renders with dark-scheme colours when the app is in dark mode', () => {
    useThemeStore.setState({ scheme: 'dark' });
    setVersionInfo('2.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.getByTestId('force-update-title')).toBeOnTheScreen();
    expect(screen.getByTestId('force-update-gate')).toBeOnTheScreen();
  });

  it('falls back to the Play Store URL when the server sends a blank one', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    setVersionInfo('2.0.0', '');
    renderWithProviders(<ForceUpdateGate />);

    fireEvent.press(screen.getByTestId('force-update-cta'));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('com.duncit.mobile'));
  });

  it('renders nothing when the build is current (not outdated)', () => {
    setVersionInfo('1.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.queryByTestId('force-update-gate')).toBeNull();
  });

  it('renders nothing while the version info is still loading / errored', () => {
    // data undefined (fail-safe): latest reads as empty, gate stays open.
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.queryByTestId('force-update-gate')).toBeNull();
  });
});

describe('ForceUpdateGate — the Force App Update feature flag', () => {
  it('never blocks an outdated build while the flag is off', () => {
    setForceUpdateFlag(false);
    setVersionInfo('2.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.queryByTestId('force-update-gate')).toBeNull();
  });

  it('holds the block back until the flags land, so an off flag never flashes it', () => {
    setForceUpdateFlag(undefined);
    setVersionInfo('2.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.queryByTestId('force-update-gate')).toBeNull();
  });

  it('still enforces when the server has no such flag (a database predating the seed)', () => {
    useFeatureFlagsStore.setState({ data: { publicFeatureFlags: [] } });
    setVersionInfo('2.0.0', 'https://play.google.com/store/apps/details?id=com.duncit.mobile');
    renderWithProviders(<ForceUpdateGate />);
    expect(screen.getByTestId('force-update-gate')).toBeOnTheScreen();
  });
});
