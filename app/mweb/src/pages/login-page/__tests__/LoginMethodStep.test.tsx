import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import LoginMethodStep from '../LoginMethodStep';

// Google and Apple have their own suites; here only what the step hands them and shows back.
vi.mock('../../../components/SocialRoundButtons', () => ({
  default: (p: { intent: string; loading: boolean; onError: (message: string) => void }) => (
    <div data-testid="social-stub" data-intent={p.intent} data-loading={String(p.loading)}>
      <button type="button" onClick={() => p.onError('Google sign-in failed')}>
        fail-social
      </button>
    </div>
  ),
}));

type Props = Parameters<typeof LoginMethodStep>[0];

const renderStep = (over: Partial<Props> = {}, url = '/login') => {
  const handlers = {
    onSocialCredential: vi.fn(),
    onSocialError: vi.fn(),
    onChoosePassword: vi.fn(),
    onChooseOtp: vi.fn(),
  };
  render(
    <MockedProvider mocks={[]}>
      <MemoryRouter initialEntries={[url]}>
        <LoginMethodStep socialLoading={false} socialError={null} {...handlers} {...over} />
      </MemoryRouter>
    </MockedProvider>,
  );
  return handlers;
};

describe('LoginMethodStep', () => {
  it('opens the password or the OTP step from its door', () => {
    const { onChoosePassword, onChooseOtp } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Password' }));
    expect(onChoosePassword).toHaveBeenCalledTimes(1);
    expect(onChooseOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with OTP' }));
    expect(onChooseOtp).toHaveBeenCalledTimes(1);
  });

  it('keeps the redirect on the way to signup', () => {
    renderStep({}, '/login?redirect=%2Fpods%2F42');
    expect(screen.getByTestId('go-signup')).toHaveTextContent('Create an account');
    expect(screen.getByTestId('go-signup').getAttribute('href')).toContain('redirect=%2Fpods%2F42');
  });

  it('offers Google and Apple as sign-in buttons and passes their failure up', () => {
    const { onSocialError } = renderStep({ socialLoading: true });
    const social = screen.getByTestId('social-stub');
    expect(social).toHaveAttribute('data-intent', 'SIGN_IN');
    expect(social).toHaveAttribute('data-loading', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'fail-social' }));
    expect(onSocialError).toHaveBeenCalledWith('Google sign-in failed');
  });

  it('shows no error before any social sign-in has failed', () => {
    renderStep();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the social sign-in error under the buttons', () => {
    renderStep({ socialError: 'Apple sign-in failed. Please try again.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Apple sign-in failed. Please try again.');
  });
});
