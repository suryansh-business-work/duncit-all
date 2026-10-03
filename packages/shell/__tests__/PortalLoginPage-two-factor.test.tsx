/**
 * The login page's authenticator step, end to end through the real dialog and
 * hook. Either door — password or emailed code — may be refused with
 * TWO_FACTOR_REQUIRED: the page must open the code step instead of showing an
 * error, and a correct code must go through the same role gate, token write and
 * redirect a password would. An expired challenge lands back on the form.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

vi.mock('@apollo/client/react', () => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
vi.mock('@duncit/utils', async (orig) => ({
  ...(await orig<typeof import('@duncit/utils')>()),
  parseApiError: (e: { message?: string }) => `DEF:${e?.message ?? ''}`,
}));

const navSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (orig) => ({ ...(await orig<typeof import('react-router')>()), useNavigate: () => navSpy }));

vi.mock('@duncit/user-context', () => ({
  LoginScreen: ({
    errorMessage,
    onSubmit,
    altSlot,
  }: {
    errorMessage?: string | null;
    onSubmit: (v: { email: string; password: string }) => void;
    altSlot?: ReactNode;
  }) => (
    <div>
      <span data-testid="err">{errorMessage}</span>
      <button onClick={() => onSubmit({ email: 'a@b.c', password: 'pw' })}>submit</button>
      {altSlot}
    </div>
  ),
}));

vi.mock('../src/portal-login/OtpLoginPanel', () => ({
  default: ({
    onSubmitCode,
    errorMessage,
  }: {
    onSubmitCode: (email: string, otp: string) => Promise<void>;
    errorMessage?: string | null;
  }) => (
    <div>
      <span data-testid="otp-err">{errorMessage}</span>
      <button onClick={() => onSubmitCode('a@b.c', '123456')}>submit-code</button>
    </div>
  ),
}));

import { print, type DocumentNode } from 'graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import PortalLoginPage from '../src/portal-login/PortalLoginPage';

const mockMutation = vi.mocked(useMutation);
const login = vi.fn();
const otpLogin = vi.fn();
const complete = vi.fn();
const session = { setToken: vi.fn(), hasAppAccess: vi.fn(() => true), accessDeniedMessage: vi.fn(() => 'no access here') };

const gqlError = (code: string, extensions: Record<string, unknown> = {}) =>
  Object.assign(new Error(code), { errors: [{ message: code, extensions: { code, ...extensions } }] });
const REQUIRED = gqlError('TWO_FACTOR_REQUIRED', { challenge_token: 'chal-1' });

/** Route each mocked mutation by the document it was given. */
const byDocument = (doc: DocumentNode) => {
  const text = print(doc);
  if (text.includes('completeTwoFactorLogin')) return complete;
  if (text.includes('loginWithPortalOtp')) return otpLogin;
  if (text.includes('requestPortalLoginOtp')) return vi.fn();
  return login;
};

const appConfig = { key: 'crm', name: 'CRM', fullName: 'Duncit CRM', tagline: 't', promoTitle: 'pt', promoText: 'px', loginImage: '/bg.png' };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/login?redirect=%2Fdash']}>
      <PortalLoginPage appConfig={appConfig} session={session} />
    </MemoryRouter>,
  );

const enterCode = async (u: ReturnType<typeof userEvent.setup>, code: string) => {
  await u.type(await screen.findByLabelText(/^Code/), code);
  await u.click(screen.getByTestId('two-factor-login-submit'));
};

beforeEach(() => {
  navSpy.mockReset();
  login.mockReset();
  otpLogin.mockReset();
  complete.mockReset();
  session.setToken.mockReset();
  vi.mocked(useQuery).mockReturnValue({ data: undefined, loading: false } as never);
  mockMutation.mockImplementation(((doc: DocumentNode) => [byDocument(doc), { loading: false }]) as never);
});

describe('PortalLoginPage — authenticator step', () => {
  it('opens the code step for a password refused with TWO_FACTOR_REQUIRED, then signs in with the code', async () => {
    const u = userEvent.setup();
    login.mockRejectedValue(REQUIRED);
    complete.mockResolvedValue({ data: { completeTwoFactorLogin: { token: 'T2', user: { roles: ['ADMIN'] } } } });
    renderPage();

    await u.click(screen.getByText('submit'));
    expect(await screen.findByRole('dialog', { name: 'Two-step verification' })).toBeInTheDocument();
    expect(screen.getByTestId('err')).toBeEmptyDOMElement();

    await enterCode(u, '654321');

    await waitFor(() => expect(session.setToken).toHaveBeenCalledWith('T2'));
    expect(complete).toHaveBeenCalledWith({ variables: { input: { challenge_token: 'chal-1', code: '654321' } } });
    expect(navSpy).toHaveBeenCalledWith('/dash', { replace: true });
  });

  it('opens the same step for an emailed code refused with TWO_FACTOR_REQUIRED', async () => {
    const u = userEvent.setup();
    otpLogin.mockRejectedValue(REQUIRED);
    renderPage();

    await u.click(screen.getByText('submit-code'));

    expect(await screen.findByRole('dialog', { name: 'Two-step verification' })).toBeInTheDocument();
    expect(screen.getByTestId('otp-err')).toBeEmptyDOMElement();
  });

  it('keeps the role gate on the code step: no access means no token', async () => {
    const u = userEvent.setup();
    login.mockRejectedValue(REQUIRED);
    session.hasAppAccess.mockReturnValueOnce(false);
    complete.mockResolvedValue({ data: { completeTwoFactorLogin: { token: 'T2', user: { roles: [] } } } });
    renderPage();

    await u.click(screen.getByText('submit'));
    await enterCode(u, '654321');

    expect(await screen.findByTestId('two-factor-login-error')).toHaveTextContent('DEF:no access here');
    expect(session.setToken).not.toHaveBeenCalled();
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('returns to the sign-in form with the reason when the challenge expired', async () => {
    const u = userEvent.setup();
    login.mockRejectedValue(REQUIRED);
    complete.mockRejectedValue(gqlError('TWO_FACTOR_CHALLENGE_EXPIRED'));
    renderPage();

    await u.click(screen.getByText('submit'));
    await enterCode(u, '654321');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('err')).toHaveTextContent('DEF:TWO_FACTOR_CHALLENGE_EXPIRED');
    expect(session.setToken).not.toHaveBeenCalled();
  });

  it('cancelling the step leaves the reader on the form, signed out', async () => {
    const u = userEvent.setup();
    login.mockRejectedValue(REQUIRED);
    renderPage();

    await u.click(screen.getByText('submit'));
    await u.click(await screen.findByTestId('two-factor-login-cancel'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(complete).not.toHaveBeenCalled();
    expect(session.setToken).not.toHaveBeenCalled();
  });
});
