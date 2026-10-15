import { Linking, Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { SmallUpdateAppSection } from '@/components/SmallUpdateAppSection';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getItem, setItem } from '@/services/secure-storage';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useLocaleStore } from '@/stores/locale.store';
import { appVersion } from '@/utils/app-version';
import { renderWithProviders } from '@/utils/test-utils';

import { SMALL_UPDATE_APP_SECTION_FLAG } from '../useSmallUpdateApp';

jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: jest.fn() }));
jest.mock('@/utils/app-version', () => ({ appVersion: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
// Nothing here should reach the network; keep any incidental request pending.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args) } },
}));

const mockedFlag = useFeatureFlag as jest.Mock;
const mockedAppVersion = appVersion as jest.Mock;
const mockedGetItem = getItem as jest.Mock;
const mockedSetItem = setItem as jest.Mock;

const DISMISSED_KEY = 'duncit.update_section_dismissed_version';
const IOS_URL = 'https://apps.apple.com/app/duncit/id1';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.duncit.mobile';
const SECTION = 'small-update-app-section';
const originalOS = Platform.OS;

/** What the saved-dismissal read answers; any other key (e.g. the locale) reads empty. */
let readDismissed: () => Promise<string | null> = () => Promise.resolve(null);

const setOS = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const setVersionInfo = (latest: string, urls: { ios?: string; android?: string } = {}) =>
  useAppVersionStore.setState({
    data: {
      appVersionInfo: {
        latest_version: latest,
        min_supported_version: '1.0.0',
        ios_store_url: urls.ios ?? IOS_URL,
        android_store_url: urls.android ?? ANDROID_URL,
      },
    },
  });

/** Lets every pending storage/Linking promise (and its catch) settle. */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** Renders and lets the saved-dismissal read settle. */
async function renderSection() {
  renderWithProviders(<SmallUpdateAppSection />);
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  setOS('android');
  mockedFlag.mockReturnValue(true);
  mockedAppVersion.mockReturnValue('1.0.0');
  readDismissed = () => Promise.resolve(null);
  mockedGetItem.mockImplementation((key: string) =>
    key === DISMISSED_KEY ? readDismissed() : Promise.resolve(null),
  );
  mockedSetItem.mockResolvedValue(undefined);
  // The translator's locale is already settled, so it never reads storage here.
  useLocaleStore.setState({ hydrated: true, appliedUserLocale: null });
  useAppVersionStore.setState({ data: undefined, isLoading: false, error: undefined });
  setVersionInfo('2.0.0');
});

afterAll(() => {
  setOS(originalOS);
});

describe('SmallUpdateAppSection — visibility', () => {
  it('shows the update card with the latest version when a newer minor is out', async () => {
    await renderSection();

    expect(screen.getByTestId(SECTION)).toBeOnTheScreen();
    expect(screen.getByText('Update available')).toBeOnTheScreen();
    expect(screen.getByText('Version 2.0.0 is out with the latest fixes.')).toBeOnTheScreen();
    expect(mockedFlag).toHaveBeenCalledWith(SMALL_UPDATE_APP_SECTION_FLAG, false);
    expect(mockedGetItem).toHaveBeenCalledWith(DISMISSED_KEY);
  });

  it('stays hidden while the saved dismissal is still loading', () => {
    readDismissed = () => new Promise(() => undefined);
    renderWithProviders(<SmallUpdateAppSection />);
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('stays hidden while the feature flag is off', async () => {
    mockedFlag.mockReturnValue(false);
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('stays hidden on web, where there is no store binary', async () => {
    setOS('web');
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('stays hidden when only the patch version is ahead', async () => {
    setVersionInfo('1.0.7');
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('stays hidden when the version info has not loaded', async () => {
    useAppVersionStore.setState({ data: undefined });
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('stays hidden when the server has no store URL for this platform', async () => {
    setOS('ios');
    setVersionInfo('2.0.0', { ios: '' });
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });
});

describe('SmallUpdateAppSection — Update opens the platform store', () => {
  it('opens the Play Store listing on Android', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    await renderSection();

    fireEvent.press(screen.getByTestId('small-update-app-section-update'));
    expect(openURL).toHaveBeenCalledWith(ANDROID_URL);
  });

  it('opens the App Store listing on iOS', async () => {
    setOS('ios');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    await renderSection();

    fireEvent.press(screen.getByTestId('small-update-app-section-update'));
    expect(openURL).toHaveBeenCalledWith(IOS_URL);
  });

  it('logs a warning when the store link cannot be opened', async () => {
    const error = new Error('no handler');
    jest.spyOn(Linking, 'openURL').mockRejectedValue(error);
    await renderSection();

    fireEvent.press(screen.getByTestId('small-update-app-section-update'));
    await flush();
    expect(mockWarn).toHaveBeenCalledWith('smallUpdateAppSection', 'openStore', { error });
  });
});

describe('SmallUpdateAppSection — dismissal', () => {
  it('hides on close and remembers the dismissed version', async () => {
    await renderSection();

    fireEvent.press(screen.getByTestId('small-update-app-section-close'));
    await flush();
    expect(screen.queryByTestId(SECTION)).toBeNull();
    expect(mockedSetItem).toHaveBeenCalledWith(DISMISSED_KEY, '2.0.0');
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('still hides when saving the dismissal fails, and logs it', async () => {
    const error = new Error('keychain locked');
    mockedSetItem.mockRejectedValue(error);
    await renderSection();

    fireEvent.press(screen.getByTestId('small-update-app-section-close'));
    await flush();
    expect(screen.queryByTestId(SECTION)).toBeNull();
    expect(mockWarn).toHaveBeenCalledWith('smallUpdateAppSection', 'saveDismissed', { error });
  });

  it('stays closed for a patch release of the dismissed version', async () => {
    readDismissed = () => Promise.resolve('2.0.0');
    setVersionInfo('2.0.4');
    await renderSection();
    expect(screen.queryByTestId(SECTION)).toBeNull();
  });

  it('comes back once a newer minor than the dismissed one lands', async () => {
    readDismissed = () => Promise.resolve('2.0.0');
    setVersionInfo('2.1.0');
    await renderSection();
    expect(screen.getByTestId(SECTION)).toBeOnTheScreen();
  });

  it('shows the card and logs when the saved dismissal cannot be read', async () => {
    const error = new Error('read failed');
    readDismissed = () => Promise.reject(error);
    await renderSection();

    expect(screen.getByTestId(SECTION)).toBeOnTheScreen();
    expect(mockWarn).toHaveBeenCalledWith('smallUpdateAppSection', 'loadDismissed', { error });
  });
});

describe('SmallUpdateAppSection — unmount before the saved dismissal loads', () => {
  it('drops a late successful read quietly', async () => {
    let resolveRead: (value: string | null) => void = () => undefined;
    readDismissed = () =>
      new Promise<string | null>((resolve) => {
        resolveRead = resolve;
      });
    const view = renderWithProviders(<SmallUpdateAppSection />);
    expect(screen.queryByTestId(SECTION)).toBeNull();
    view.unmount();

    resolveRead('1.0.0');
    await flush();
    expect(mockedGetItem).toHaveBeenCalledWith(DISMISSED_KEY);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('still logs a late failed read after the section is gone', async () => {
    let rejectRead: (reason: Error) => void = () => undefined;
    readDismissed = () =>
      new Promise<string | null>((_resolve, reject) => {
        rejectRead = reject;
      });
    const view = renderWithProviders(<SmallUpdateAppSection />);
    view.unmount();

    const error = new Error('late failure');
    rejectRead(error);
    await flush();
    expect(mockWarn).toHaveBeenCalledWith('smallUpdateAppSection', 'loadDismissed', { error });
  });
});
