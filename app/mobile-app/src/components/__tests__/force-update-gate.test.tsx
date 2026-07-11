import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { useAppVersionStore } from '@/stores/app-version.store';
import { appVersion } from '@/utils/app-version';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/utils/app-version', () => ({ appVersion: jest.fn(() => '1.0.0') }));
const mockedAppVersion = appVersion as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedAppVersion.mockReturnValue('1.0.0');
  useAppVersionStore.setState({ data: undefined, isLoading: false, error: undefined });
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
