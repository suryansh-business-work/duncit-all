import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(),
  discovery: { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
}));
jest.mock('expo-auth-session', () => ({ exchangeCodeAsync: jest.fn() }));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: (selector: (s: { scheme: 'light' | 'dark' }) => unknown) =>
    selector({ scheme: mockScheme }),
}));

const mockedHook = jest.mocked(Google.useIdTokenAuthRequest);

function mockHook(response: unknown, promptAsync = jest.fn().mockResolvedValue(undefined)) {
  mockedHook.mockReturnValue([{} as never, response as never, promptAsync as never]);
  return promptAsync;
}

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });
  afterEach(() => jest.clearAllMocks());

  it('triggers the prompt on press', () => {
    const promptAsync = mockHook(null);
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} />);
    fireEvent.press(screen.getByTestId('google-auth-button'));
    expect(promptAsync).toHaveBeenCalledTimes(1);
  });

  it('renders the Google G icon in both light and dark schemes', () => {
    mockHook(null);
    const { rerender } = renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} />);
    expect(screen.getByTestId('google-auth-icon')).toBeTruthy();
    mockScheme = 'dark';
    rerender(<GoogleAuthButton onIdToken={jest.fn()} />);
    expect(screen.getByTestId('google-auth-icon')).toBeTruthy();
  });

  it('returns the id token on a successful response', async () => {
    mockHook({ type: 'success', params: { id_token: 'google-token' } });
    const onIdToken = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={onIdToken} />);
    await waitFor(() => expect(onIdToken).toHaveBeenCalledWith('google-token'));
  });

  it('reports an error when the response carries no id token', async () => {
    mockHook({ type: 'success', params: {} });
    const onError = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/id token/i)));
  });

  it('reports a Google error response', async () => {
    mockHook({ type: 'error', error: { message: 'popup blocked' } });
    const onError = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('popup blocked'));
  });

  it('uses a generic message when the error carries no detail', async () => {
    mockHook({ type: 'error' });
    const onError = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Google sign-in failed.'));
  });

  it('ignores a dismissed (neither success nor error) response', async () => {
    const onError = jest.fn();
    const onIdToken = jest.fn();
    mockHook({ type: 'dismiss' });
    renderWithProviders(<GoogleAuthButton onIdToken={onIdToken} onError={onError} />);
    await waitFor(() => expect(screen.getByTestId('google-auth-button')).toBeTruthy());
    expect(onError).not.toHaveBeenCalled();
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it('does not prompt while disabled', () => {
    const promptAsync = mockHook(null);
    renderWithProviders(<GoogleAuthButton disabled onIdToken={jest.fn()} />);
    fireEvent.press(screen.getByTestId('google-auth-button'));
    expect(promptAsync).not.toHaveBeenCalled();
  });
});

describe('GoogleAuthButton — the native code exchange', () => {
  const REQUEST = {
    clientId: 'android-client',
    redirectUri: 'app:/oauthredirect',
    codeVerifier: 'v1',
  };
  const exchange = jest.mocked(exchangeCodeAsync);
  const codeAnswer = { type: 'success', params: { code: 'one-time-code' } };

  function mockNative(request: unknown = REQUEST) {
    mockedHook.mockReturnValue([request as never, codeAnswer as never, jest.fn() as never]);
  }

  afterEach(() => jest.clearAllMocks());

  it('exchanges the one-time code for the id token with the PKCE verifier', async () => {
    exchange.mockResolvedValue({ idToken: 'native-token' } as never);
    mockNative();
    const onIdToken = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={onIdToken} />);

    await waitFor(() => expect(onIdToken).toHaveBeenCalledWith('native-token'));
    expect(exchange).toHaveBeenCalledWith(
      {
        clientId: 'android-client',
        redirectUri: 'app:/oauthredirect',
        code: 'one-time-code',
        extraParams: { code_verifier: 'v1' },
      },
      // Google's own token endpoint, as the provider module publishes it.
      { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
    );
  });

  it('reports a failed exchange instead of waiting forever', async () => {
    exchange.mockRejectedValue(new Error('invalid_grant'));
    mockNative();
    const onError = jest.fn();
    const onIdToken = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={onIdToken} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Google sign-in failed.'));
    expect(onIdToken).not.toHaveBeenCalled();
  });

  it('reports a missing token when the exchange answers without one', async () => {
    exchange.mockResolvedValue({} as never);
    mockNative();
    const onError = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/id token/i)));
  });

  it('never exchanges a code the request holds no verifier for', async () => {
    mockNative({ clientId: 'android-client', redirectUri: 'app:/oauthredirect' });
    const onError = jest.fn();
    renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/id token/i)));
    expect(exchange).not.toHaveBeenCalled();
  });

  it('says nothing about an exchange that settles after the screen has gone', async () => {
    let fail: (error: Error) => void = () => undefined;
    exchange.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }) as never,
    );
    mockNative();
    const onError = jest.fn();
    const view = renderWithProviders(<GoogleAuthButton onIdToken={jest.fn()} onError={onError} />);
    await waitFor(() => expect(exchange).toHaveBeenCalled());
    view.unmount();

    fail(new Error('invalid_grant'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onError).not.toHaveBeenCalled();
  });
});
