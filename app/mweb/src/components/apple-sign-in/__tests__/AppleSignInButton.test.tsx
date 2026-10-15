import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth as authTokens } from '@duncit/auth-tokens';
import { BUTTON_SIZES } from '@duncit/buttons';
import AppleSignInButton from '../AppleSignInButton';

const apple = vi.hoisted(() => ({
  config: { servicesId: 'com.duncit.web', redirectUri: 'https://duncit.test/auth/apple' },
  signIn: vi.fn(),
}));
vi.mock('../useAppleJs', () => ({
  useAppleWebConfig: () => apple.config,
  useAppleJs: () => ({ signIn: apple.signIn }),
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
