import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import {
  appleRouteForPlatform,
  isAppleAuthReturn,
  signInWithApple,
} from '@/components/AppleAuthButton/appleSignIn';

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `duncit://${path}`,
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));

const signInAsync = jest.mocked(AppleAuthentication.signInAsync);
const openAuthSession = jest.mocked(WebBrowser.openAuthSessionAsync);
const WEB = { servicesId: 'com.duncit.web', relayUrl: 'https://api.duncit.test/apple/callback' };
const originalOS = Platform.OS;

const onPlatform = (os: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  onPlatform(originalOS);
});

describe('appleRouteForPlatform / isAppleAuthReturn', () => {
  it("uses Apple's own sheet on iOS and the web flow everywhere else", () => {
    onPlatform('ios');
    expect(appleRouteForPlatform()).toBe('NATIVE');
    onPlatform('android');
    expect(appleRouteForPlatform()).toBe('WEB');
  });

  it("recognises the relay's answer coming back, with or without a leading slash", () => {
    expect(isAppleAuthReturn('apple-auth')).toBe(true);
    expect(isAppleAuthReturn('//apple-auth#id_token=x')).toBe(true);
    expect(isAppleAuthReturn('pod/apple-auth')).toBe(false);
  });
});

describe('signInWithApple — the iOS sheet', () => {
  beforeEach(() => onPlatform('ios'));

  it('asks for the name and email and hands back the token with the full name', async () => {
    signInAsync.mockResolvedValue({
      identityToken: 'apple-token',
      fullName: { givenName: 'Riya', familyName: 'Sen' },
    } as never);

    await expect(signInWithApple(WEB)).resolves.toEqual({
      provider: 'APPLE',
      idToken: 'apple-token',
      name: 'Riya Sen',
    });
    expect(signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1] });
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it('leaves the name out on a later sign-in, when Apple sends none', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-token', fullName: null } as never);

    await expect(signInWithApple(WEB)).resolves.toEqual({
      provider: 'APPLE',
      idToken: 'apple-token',
    });
  });

  it('answers null when the person cancels the sheet', async () => {
    signInAsync.mockRejectedValue(
      Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }),
    );

    await expect(signInWithApple(WEB)).resolves.toBeNull();
  });

  it('fails when Apple returns no identity token', async () => {
    signInAsync.mockResolvedValue({ identityToken: null, fullName: null } as never);

    await expect(signInWithApple(WEB)).rejects.toThrow('apple_no_identity_token');
  });

  it('passes any other failure on', async () => {
    signInAsync.mockRejectedValue(null);

    await expect(signInWithApple(WEB)).rejects.toBeNull();
  });
});

describe('signInWithApple — the web flow', () => {
  beforeEach(() => onPlatform('android'));

  it("opens Apple's authorize page with the relay and the app's return address", async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' } as never);

    await expect(signInWithApple(WEB)).resolves.toBeNull();

    const [authorizeUrl, returnUrl] = openAuthSession.mock.calls[0] ?? [];
    expect(returnUrl).toBe('duncit://apple-auth');
    const url = new URL(String(authorizeUrl));
    expect(`${url.origin}${url.pathname}`).toBe('https://appleid.apple.com/auth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'com.duncit.web',
      redirect_uri: 'https://api.duncit.test/apple/callback',
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state: 'duncit://apple-auth',
    });
  });

  it("reads the token and the decoded name out of the relay's fragment", async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'duncit://apple-auth#id_token=web-token&name=Riya+Sen%21',
    } as never);

    await expect(signInWithApple(WEB)).resolves.toEqual({
      provider: 'APPLE',
      idToken: 'web-token',
      name: 'Riya Sen!',
    });
  });

  it('hands back the token alone when the relay sends no name', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'duncit://apple-auth#id_token=web-token',
    } as never);

    await expect(signInWithApple(WEB)).resolves.toEqual({
      provider: 'APPLE',
      idToken: 'web-token',
    });
  });

  it("answers null when the person backs out on Apple's page", async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'duncit://apple-auth#error=user_cancelled_authorize',
    } as never);

    await expect(signInWithApple(WEB)).resolves.toBeNull();
  });

  it("fails with the relay's error", async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'duncit://apple-auth#error=invalid_client',
    } as never);

    await expect(signInWithApple(WEB)).rejects.toThrow('invalid_client');
  });

  it('fails plainly when the answer carries neither a token nor an error', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'duncit://apple-auth' } as never);

    await expect(signInWithApple(WEB)).rejects.toThrow('apple_no_id_token');
  });

  it('skips empty and key-less pairs in the fragment', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'duncit://apple-auth#&id_token=web-token&&flag',
    } as never);

    await expect(signInWithApple(WEB)).resolves.toEqual({
      provider: 'APPLE',
      idToken: 'web-token',
    });
  });
});
