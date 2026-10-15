import type { ReactTestInstance } from 'react-test-renderer';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { auth } from '@duncit/auth-tokens';
import { BUTTON_SIZES } from '@duncit/buttons-native';
import type { SocialCredential } from '@duncit/utils';

import { AppleAuthButton } from '@/components/AppleAuthButton';
import { useConfigStore } from '@/stores/config.store';
import { renderWithProviders } from '@/utils/test-utils';

import { appleRouteForPlatform, signInWithApple } from '../appleSignIn';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('../appleSignIn', () => ({
  appleRouteForPlatform: jest.fn(),
  signInWithApple: jest.fn(),
}));

const mockedRoute = jest.mocked(appleRouteForPlatform);
const mockedSignIn = jest.mocked(signInWithApple);

const LABEL = 'Sign in with Apple';
const CREDENTIAL: SocialCredential = { provider: 'APPLE', idToken: 'apple-token' };

const ariaLabel = (node: ReactTestInstance): unknown =>
  node.props['aria-label'] ?? node.props.accessibilityLabel;
/** The logo's size (the vector-icons wrapper and its inner icon both carry the props). */
const appleIconSize = (): number =>
  screen.UNSAFE_getAllByProps({ name: 'logo-apple' })[0]?.props.size;

function renderButton(
  props: Partial<{ loading: boolean; variant: 'pill' | 'icon' }> = {},
  handlers = { onCredential: jest.fn(), onError: jest.fn() },
) {
  renderWithProviders(<AppleAuthButton label={LABEL} {...handlers} {...props} />);
  return handlers;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRoute.mockReturnValue('NATIVE');
  useConfigStore.setState({
    appleBundleId: 'com.duncit.mobile',
    appleServicesId: 'com.duncit.web',
    appleRelayUrl: 'https://api.duncit.test/apple/callback',
  });
});

describe('AppleAuthButton — when it is offered', () => {
  it('renders nothing on iOS until Tech holds the App ID', () => {
    useConfigStore.setState({ appleBundleId: '' });
    renderButton();
    expect(screen.queryByTestId('apple-auth-button')).toBeNull();
  });

  it('needs both the Services ID and the relay on the web flow', () => {
    mockedRoute.mockReturnValue('WEB');
    useConfigStore.setState({ appleRelayUrl: '' });
    renderButton();
    expect(screen.queryByTestId('apple-auth-button')).toBeNull();
  });

  it('is offered on the web flow once both are configured', () => {
    mockedRoute.mockReturnValue('WEB');
    useConfigStore.setState({ appleBundleId: '' });
    renderButton();
    expect(screen.getByTestId('apple-auth-button')).toBeOnTheScreen();
  });
});

describe('AppleAuthButton — variants', () => {
  it('draws the labelled pill with the standard icon size', () => {
    renderButton();
    expect(screen.getByText(LABEL)).toBeOnTheScreen();
    expect(ariaLabel(screen.getByTestId('apple-auth-button'))).toBeUndefined();
    expect(appleIconSize()).toBe(BUTTON_SIZES.lg.iconSize);
  });

  it('draws the round logo-only button, named for a screen reader, with a larger logo', () => {
    renderButton({ variant: 'icon' });
    expect(screen.queryByText(LABEL)).toBeNull();
    expect(ariaLabel(screen.getByTestId('apple-auth-button'))).toBe(LABEL);
    expect(appleIconSize()).toBe(Math.round(BUTTON_SIZES.lg.height * auth.fit.socialIconRatio));
    expect(appleIconSize()).toBeGreaterThan(BUTTON_SIZES.lg.iconSize);
  });

  it('waits on the parent: a spinner, the connecting name, and presses ignored', () => {
    renderButton({ variant: 'icon', loading: true });
    expect(screen.getByTestId('apple-auth-spinner')).toBeOnTheScreen();
    expect(ariaLabel(screen.getByTestId('apple-auth-button'))).toBe('Connecting to Apple…');
    fireEvent.press(screen.getByTestId('apple-auth-button'));
    expect(mockedSignIn).not.toHaveBeenCalled();
  });
});

describe('AppleAuthButton — signing in', () => {
  it('hands the credential over and ends its own wait', async () => {
    let finish: (credential: SocialCredential | null) => void = () => undefined;
    mockedSignIn.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { onCredential, onError } = renderButton();

    fireEvent.press(screen.getByTestId('apple-auth-button'));
    expect(mockedSignIn).toHaveBeenCalledWith({
      servicesId: 'com.duncit.web',
      relayUrl: 'https://api.duncit.test/apple/callback',
    });
    expect(screen.getByTestId('apple-auth-spinner')).toBeOnTheScreen();
    expect(screen.getByText('Connecting to Apple…')).toBeOnTheScreen();

    // A second tap while Apple is open does not start another sign-in.
    fireEvent.press(screen.getByTestId('apple-auth-button'));
    expect(mockedSignIn).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish(CREDENTIAL);
    });
    expect(onCredential).toHaveBeenCalledWith(CREDENTIAL);
    expect(onError).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('apple-auth-spinner')).toBeNull());
  });

  it('says nothing when the person backs out of Apple', async () => {
    mockedSignIn.mockResolvedValue(null);
    const { onCredential, onError } = renderButton();

    fireEvent.press(screen.getByTestId('apple-auth-button'));
    await waitFor(() => expect(screen.queryByTestId('apple-auth-spinner')).toBeNull());
    expect(onCredential).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a failed sign-in', async () => {
    mockedSignIn.mockRejectedValue(new Error('apple down'));
    const { onCredential, onError } = renderButton();

    fireEvent.press(screen.getByTestId('apple-auth-button'));
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('Apple sign-in failed. Please try again.'),
    );
    expect(onCredential).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('apple-auth-spinner')).toBeNull());
  });
});
