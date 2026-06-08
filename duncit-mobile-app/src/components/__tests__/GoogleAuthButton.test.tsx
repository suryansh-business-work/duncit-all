import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Google from 'expo-auth-session/providers/google';

import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useIdTokenAuthRequest: jest.fn() }));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: (selector: (s: { scheme: 'light' | 'dark' }) => unknown) =>
    selector({ scheme: mockScheme }),
}));

const mockedHook = jest.mocked(Google.useIdTokenAuthRequest);

function mockHook(response: unknown, promptAsync = jest.fn()) {
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
});
