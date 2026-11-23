/**
 * The gate in front of every console. Whatever address was asked for, a
 * sign-in that has not completed Security Verification sees the screen there;
 * a verified one is checked once, and again when requests start being refused;
 * a session with no claim at all is left alone; the login page is never covered.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apollo = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@apollo/client/react', () => ({ useApolloClient: () => apollo }));

const userData = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock('@duncit/user-context', async (orig) => ({
  ...(await orig<typeof import('@duncit/user-context')>()),
  useUserData: () => userData,
}));

vi.mock('../src/security-verification/SecurityVerificationScreen', () => ({
  SecurityVerificationScreen: ({ portalName, onSignOut }: { portalName: string; onSignOut: () => void }) => (
    <div data-testid="screen" data-portal={portalName}>
      <button onClick={onSignOut}>leave</button>
    </div>
  ),
}));

import { AUTH_CHANGED_EVENT, emitAuthChanged } from '@duncit/user-context';
import { ShellRuntimeProvider } from '../src/lib/runtime';
import { PORTAL_SECURITY_CHALLENGE } from '../src/security-verification/documents';
import { PortalSecurityGate } from '../src/security-verification/PortalSecurityGate';
import { PORTAL_SECURITY_RECHECK_EVENT } from '../src/security-verification/sessionClaim';
import { pendingToken, portalToken, verifiedToken } from './helpers/portalToken';

const KEY = 'finance_token';

function mount(path = '/dashboard', token?: string) {
  if (token) localStorage.setItem(KEY, token);
  return render(
    <ShellRuntimeProvider graphqlUrl="https://api.test/graphql" tokenKey={KEY}>
      <MemoryRouter initialEntries={[path]}>
        <PortalSecurityGate portalName="Duncit Finance">
          <div data-testid="console">console</div>
        </PortalSecurityGate>
      </MemoryRouter>
    </ShellRuntimeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  apollo.query.mockReset();
  apollo.query.mockResolvedValue({ data: {} });
  userData.logout.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a sign-in that has not completed the screen', () => {
  it('sees the screen instead of the page it asked for, named for the console', () => {
    mount('/finance/payouts', pendingToken());
    expect(screen.getByTestId('screen')).toHaveAttribute('data-portal', 'Duncit Finance');
    expect(screen.queryByTestId('console')).not.toBeInTheDocument();
  });

  it('does not make a request of its own: the screen does that', () => {
    mount('/', pendingToken());
    expect(apollo.query).not.toHaveBeenCalled();
  });

  it('is never kept off the login page, so the person can back out and sign in as someone else', () => {
    mount('/login', pendingToken());
    expect(screen.getByTestId('console')).toBeInTheDocument();
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
  });

  it('meets the screen the moment the token is stored, wherever it was at', async () => {
    mount('/finance/payouts');
    expect(screen.getByTestId('console')).toBeInTheDocument();

    localStorage.setItem(KEY, pendingToken());
    act(() => emitAuthChanged());

    expect(await screen.findByTestId('screen')).toBeInTheDocument();
  });

  it('picks up a token written by another tab', async () => {
    mount('/finance');
    localStorage.setItem(KEY, pendingToken());
    act(() => {
      globalThis.window.dispatchEvent(new Event('storage'));
    });
    expect(await screen.findByTestId('screen')).toBeInTheDocument();
  });
});

describe('a session that is left alone', () => {
  it.each([
    ['no token at all', undefined],
    ['a session from before this existed (no claim)', portalToken()],
  ])('shows the console for %s, and asks the server nothing', (_name, token) => {
    mount('/finance', token);
    expect(screen.getByTestId('console')).toBeInTheDocument();
    expect(apollo.query).not.toHaveBeenCalled();
  });
});

describe('a session that completed the screen', () => {
  it('is checked once on load, and stays on the console when the server has nothing to ask of it', async () => {
    apollo.query.mockRejectedValue(new Error('No security verification is waiting for this session'));
    mount('/finance', verifiedToken());

    await waitFor(() => expect(apollo.query).toHaveBeenCalledTimes(1));
    expect(apollo.query).toHaveBeenCalledWith({ query: PORTAL_SECURITY_CHALLENGE, fetchPolicy: 'network-only' });
    expect(screen.getByTestId('console')).toBeInTheDocument();
    expect(screen.queryByTestId('screen')).not.toBeInTheDocument();
  });

  it('gets the screen back when the server says the terms changed', async () => {
    apollo.query.mockResolvedValue({ data: { portalSecurityChallenge: {} } });
    mount('/finance', verifiedToken());
    expect(await screen.findByTestId('screen')).toBeInTheDocument();
    expect(screen.queryByTestId('console')).not.toBeInTheDocument();
  });

  it('asks again when requests start being refused as signed-out', async () => {
    apollo.query.mockRejectedValue(new Error('not waiting'));
    mount('/finance', verifiedToken());
    await waitFor(() => expect(apollo.query).toHaveBeenCalledTimes(1));

    act(() => {
      globalThis.window.dispatchEvent(new Event(PORTAL_SECURITY_RECHECK_EVENT));
    });
    await waitFor(() => expect(apollo.query).toHaveBeenCalledTimes(2));
  });

  it('stops listening for refusals once it is gone', async () => {
    apollo.query.mockRejectedValue(new Error('not waiting'));
    const { unmount } = mount('/finance', verifiedToken());
    await waitFor(() => expect(apollo.query).toHaveBeenCalledTimes(1));
    unmount();

    globalThis.window.dispatchEvent(new Event(PORTAL_SECURITY_RECHECK_EVENT));
    expect(apollo.query).toHaveBeenCalledTimes(1);
  });

  it('goes back to the console once a fresh verified session replaces the stale one', async () => {
    apollo.query.mockResolvedValue({ data: { portalSecurityChallenge: {} } });
    mount('/finance', verifiedToken('finance', 'old'));
    expect(await screen.findByTestId('screen')).toBeInTheDocument();

    apollo.query.mockRejectedValue(new Error('not waiting'));
    localStorage.setItem(KEY, verifiedToken('finance', 'new'));
    act(() => emitAuthChanged());

    await waitFor(() => expect(screen.getByTestId('console')).toBeInTheDocument());
  });
});

describe('leaving from the screen', () => {
  it('forgets the token, tells the tab, and signs out', async () => {
    const seen = vi.fn();
    globalThis.window.addEventListener(AUTH_CHANGED_EVENT, seen);
    mount('/finance', pendingToken());
    seen.mockClear();

    await userEvent.setup().click(screen.getByRole('button', { name: 'leave' }));

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(seen).toHaveBeenCalled();
    expect(userData.logout).toHaveBeenCalledTimes(1);
    globalThis.window.removeEventListener(AUTH_CHANGED_EVENT, seen);
  });
});
