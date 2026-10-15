import type { ReactTestInstance } from 'react-test-renderer';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '@duncit/auth-tokens';
import { BUTTON_SIZES } from '@duncit/buttons-native';

import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useIdTokenAuthRequest: jest.fn() }));
jest.mock('expo-auth-session', () => ({ exchangeCodeAsync: jest.fn() }));

const mockedHook = jest.mocked(Google.useIdTokenAuthRequest);

/** The G's kit tile is twice the G, so the G itself lands at `socialIconRatio` of the circle. */
const ROUND_TILE = Math.round((BUTTON_SIZES.lg.height * auth.fit.socialIconRatio) / 0.5);

const ariaLabel = (node: ReactTestInstance): unknown =>
  node.props['aria-label'] ?? node.props.accessibilityLabel;

function mockPrompt(promptAsync: jest.Mock) {
  mockedHook.mockReturnValue([{} as never, null, promptAsync as never]);
  return promptAsync;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrompt(jest.fn().mockResolvedValue({ type: 'dismiss' }));
});

describe('GoogleAuthButton — round variant', () => {
  it('draws the G alone, sized to the circle, and names the button for a screen reader', () => {
    renderWithProviders(
      <GoogleAuthButton variant="icon" label="Sign in with Google" onIdToken={jest.fn()} />,
    );
    const button = screen.getByTestId('google-auth-button');
    expect(ariaLabel(button)).toBe('Sign in with Google');
    expect(screen.queryByText('Sign in with Google')).toBeNull();
    expect(screen.getByTestId('google-auth-icon').props.style).toEqual({
      width: ROUND_TILE,
      height: ROUND_TILE,
    });
  });

  it('keeps the pill G at its small size with the label beside it', () => {
    renderWithProviders(<GoogleAuthButton label="Sign in with Google" onIdToken={jest.fn()} />);
    expect(screen.getByText('Sign in with Google')).toBeOnTheScreen();
    expect(ariaLabel(screen.getByTestId('google-auth-button'))).toBeUndefined();
    expect(screen.getByTestId('google-auth-icon').props.style).toEqual({ width: 20, height: 20 });
  });

  it('is named for the wait while the parent spends the token', () => {
    const promptAsync = mockPrompt(jest.fn());
    renderWithProviders(<GoogleAuthButton variant="icon" loading onIdToken={jest.fn()} />);
    expect(screen.getByTestId('google-auth-spinner')).toBeOnTheScreen();
    expect(ariaLabel(screen.getByTestId('google-auth-button'))).toBe('Connecting to Google…');
    fireEvent.press(screen.getByTestId('google-auth-button'));
    expect(promptAsync).not.toHaveBeenCalled();
  });
});

describe('GoogleAuthButton — the prompt settling', () => {
  it('goes idle again when the person backs out of the prompt', async () => {
    const promptAsync = mockPrompt(jest.fn().mockResolvedValue({ type: 'dismiss' }));
    renderWithProviders(<GoogleAuthButton variant="icon" onIdToken={jest.fn()} />);

    fireEvent.press(screen.getByTestId('google-auth-button'));
    expect(promptAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('google-auth-icon')).toBeOnTheScreen());
  });

  it('reports a prompt that never opened and goes idle', async () => {
    mockPrompt(jest.fn().mockRejectedValue(new Error('no browser')));
    const onError = jest.fn();
    renderWithProviders(
      <GoogleAuthButton variant="icon" onIdToken={jest.fn()} onError={onError} />,
    );

    fireEvent.press(screen.getByTestId('google-auth-button'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Google sign-in failed.'));
    expect(screen.getByTestId('google-auth-icon')).toBeOnTheScreen();
  });
});
