import { Linking as RNLinking } from 'react-native';
import * as Linking from 'expo-linking';

import { getInitialURL, NATIVE_INITIAL_URL_TIMEOUT_MS } from '@/navigation/initialURL';
import { linking } from '@/navigation/linking';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `duncit://${path}`,
  getLinkingURL: jest.fn(),
  clearInitialURL: jest.fn(),
}));

const getLinkingURL = Linking.getLinkingURL as jest.Mock;
const clearInitialURL = Linking.clearInitialURL as jest.Mock;

describe('getInitialURL', () => {
  let nativeInitialURL: jest.SpyInstance;

  beforeEach(() => {
    getLinkingURL.mockReset();
    clearInitialURL.mockReset();
    nativeInitialURL = jest.spyOn(RNLinking, 'getInitialURL');
  });

  afterEach(() => {
    nativeInitialURL.mockRestore();
    jest.useRealTimers();
  });

  it('is the navigator’s initial-URL source, replacing the 150 ms default', () => {
    expect(linking.getInitialURL).toBe(getInitialURL);
  });

  it('returns the launch URL expo-linking recorded, without waiting on React Native', async () => {
    getLinkingURL.mockReturnValue('duncit://club/run-club/pod/sunday-5k?utm_source=mweb');

    await expect(getInitialURL()).resolves.toBe(
      'duncit://club/run-club/pod/sunday-5k?utm_source=mweb',
    );
    expect(nativeInitialURL).not.toHaveBeenCalled();
  });

  it('clears the recorded URL once read, so a remounted navigator cannot replay it', async () => {
    getLinkingURL.mockReturnValue('https://mweb.duncit.com/venue/v1');

    await getInitialURL();

    expect(clearInitialURL).toHaveBeenCalledTimes(1);
  });

  it('falls back to React Native when nothing was recorded', async () => {
    getLinkingURL.mockReturnValue(null);
    nativeInitialURL.mockResolvedValue('https://mweb.duncit.com/gigs/g-7');

    await expect(getInitialURL()).resolves.toBe('https://mweb.duncit.com/gigs/g-7');
    expect(clearInitialURL).not.toHaveBeenCalled();
  });

  it('waits past React Navigation’s 150 ms for a slow React Native answer', async () => {
    jest.useFakeTimers();
    getLinkingURL.mockReturnValue(null);
    nativeInitialURL.mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve('duncit://explore'), 400)),
    );

    const url = getInitialURL();
    jest.advanceTimersByTime(400);

    await expect(url).resolves.toBe('duncit://explore');
  });

  it('opens without a link when React Native never answers', async () => {
    jest.useFakeTimers();
    getLinkingURL.mockReturnValue(null);
    nativeInitialURL.mockReturnValue(new Promise(() => undefined));

    const url = getInitialURL();
    jest.advanceTimersByTime(NATIVE_INITIAL_URL_TIMEOUT_MS);

    await expect(url).resolves.toBeNull();
  });

  it('resolves null for a plain launch that carried no link', async () => {
    getLinkingURL.mockReturnValue(null);
    nativeInitialURL.mockResolvedValue(null);

    await expect(getInitialURL()).resolves.toBeNull();
  });
});
