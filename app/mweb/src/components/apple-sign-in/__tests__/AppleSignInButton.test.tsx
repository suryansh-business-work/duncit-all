import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { auth as authTokens } from '@duncit/auth-tokens';
import { BUTTON_SIZES } from '@duncit/buttons';
import AppleSignInButton from '../AppleSignInButton';

const apple = vi.hoisted(() => ({
  config: { servicesId: 'com.duncit.web', redirectUri: 'https://duncit.test/auth/apple' },
  signIn: vi.fn(),
  available: true,
}));
vi.mock('../useAppleJs', () => ({
  useAppleWebConfig: () => apple.config,
  useAppleJs: () => (apple.available ? { signIn: apple.signIn } : null),
  isAppleCancel: (error: unknown) => (error as { error?: string })?.error === 'popup_closed_by_user',
  appleCredentialOf: () => ({ provider: 'APPLE', id_token: 'id-token' }),
}));

const renderRound = (over: Partial<Parameters<typeof AppleSignInButton>[0]> = {}) => {
  const onCredential = vi.fn();
  const onError = vi.fn();
  render(
    <AppleSignInButton label="Continue with Apple" variant="icon" onCredential={onCredential} onError={onError} {...over} />,
  );
  return { onCredential, onError };
};

afterEach(() => {
  apple.signIn.mockReset();
  apple.available = true;
  apple.config = { servicesId: 'com.duncit.web', redirectUri: 'https://duncit.test/auth/apple' };
});

describe('AppleSignInButton — round (icon) variant', () => {
  it('is a round, labelled button whose logo fills the share of the circle the native twin uses', () => {
    renderRound();
    const button = screen.getByRole('button', { name: 'Continue with Apple' });
    expect(button).toHaveStyle({ width: `${BUTTON_SIZES.lg.height}px`, height: `${BUTTON_SIZES.lg.height}px` });
    const logo = button.querySelector('svg') as SVGElement;
    expect(logo).not.toBeNull();
    expect(logo).toHaveStyle({ fontSize: `${Math.round(BUTTON_SIZES.lg.height * authTokens.fit.socialIconRatio)}px` });
  });

  it('hands the credential over once Apple answers', async () => {
    apple.signIn.mockResolvedValue({ authorization: { id_token: 'id-token' } });
    const { onCredential, onError } = renderRound();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Apple' }));
    await waitFor(() => expect(onCredential).toHaveBeenCalledWith({ provider: 'APPLE', id_token: 'id-token' }));
    expect(onError).not.toHaveBeenCalled();
  });

  it('shows a spinner, and says it is connecting, while the page spends the token', () => {
    renderRound({ loading: true });
    const button = screen.getByRole('button', { name: 'Connecting to Apple…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders nothing until the Tech portal holds a Services ID and Return URL', () => {
    apple.config = { servicesId: '', redirectUri: '' };
    renderRound();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

const renderPill = (over: Partial<Parameters<typeof AppleSignInButton>[0]> = {}, mode: 'light' | 'dark' = 'light') => {
  const onCredential = vi.fn();
  const onError = vi.fn();
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <AppleSignInButton label="Sign in with Apple" onCredential={onCredential} onError={onError} {...over} />
    </ThemeProvider>,
  );
  return { onCredential, onError };
};

describe('AppleSignInButton — pill (default) variant', () => {
  it('is Apple’s black pill with its logo and the page’s label on a light theme', () => {
    renderPill();
    const button = screen.getByRole('button', { name: 'Sign in with Apple' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).toHaveStyle({ backgroundColor: '#000', color: '#fff' });
  });

  it('turns white with black ink on a dark theme', () => {
    renderPill({}, 'dark');
    expect(screen.getByRole('button', { name: 'Sign in with Apple' })).toHaveStyle({ backgroundColor: '#fff', color: '#000' });
  });

  it('says it is connecting, and ignores a second press, while Apple’s popup is open', async () => {
    let answer: (value: unknown) => void = () => undefined;
    apple.signIn.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { onCredential } = renderPill();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Apple' }));
    const busy = await screen.findByRole('button', { name: 'Connecting to Apple…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(busy);
    expect(apple.signIn).toHaveBeenCalledTimes(1);

    answer({ authorization: { id_token: 'id-token' } });
    await waitFor(() => expect(onCredential).toHaveBeenCalledWith({ provider: 'APPLE', id_token: 'id-token' }));
    expect(await screen.findByRole('button', { name: 'Sign in with Apple' })).not.toHaveAttribute('aria-busy');
  });

  it('reports a failed sign-in through onError', async () => {
    apple.signIn.mockRejectedValue({ error: 'invalid_client' });
    const { onCredential, onError } = renderPill();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Apple' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Apple sign-in failed. Please try again.'));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('says nothing when the person closes Apple’s popup', async () => {
    apple.signIn.mockRejectedValue({ error: 'popup_closed_by_user' });
    const { onError } = renderPill();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Apple' }));
    expect(screen.getByRole('button', { name: 'Connecting to Apple…' })).toBeInTheDocument();

    // The popup closing ends the wait without a word.
    expect(await screen.findByRole('button', { name: 'Sign in with Apple' })).not.toHaveAttribute('aria-busy');
    expect(apple.signIn).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('is disabled, and asks Apple nothing, until Apple’s script has loaded', () => {
    apple.available = false;
    renderPill();
    const button = screen.getByRole('button', { name: 'Sign in with Apple' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(apple.signIn).not.toHaveBeenCalled();
  });
});
