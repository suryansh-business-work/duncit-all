import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { LiteSessionValue } from '../../../shared/session';
import { RequireAdmin } from '../../layout/RequireAdmin';
import { makeMe, makeSession } from '../fixtures';

const state = vi.hoisted(() => ({ session: null as LiteSessionValue | null }));

vi.mock('../../../shared/session', () => ({
  useLiteSession: () => {
    if (!state.session) throw new Error('session not set');
    return state.session;
  },
}));

beforeEach(() => {
  state.session = makeSession();
});

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <p>Login screen, back to {from}</p>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<RequireAdmin />}>
          <Route path="/events" element={<p>Console events</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('RequireAdmin', () => {
  it('lets an admin through to the page', () => {
    renderAt('/events');
    expect(screen.getByText('Console events')).toBeInTheDocument();
  });

  it('holds on a loader while the stored session is checked', () => {
    state.session = makeSession({ me: null, resolving: true });
    renderAt('/events');
    expect(screen.getByRole('status', { name: 'Checking your session…' })).toBeInTheDocument();
    expect(screen.queryByText('Console events')).not.toBeInTheDocument();
  });

  it('sends a visitor to sign in, remembering where they were going', () => {
    state.session = makeSession({ signedIn: false, me: null });
    renderAt('/events');
    expect(screen.getByText('Login screen, back to /events')).toBeInTheDocument();
  });

  it('says the account could not be checked, not that it lacks access, when the API cannot be reached', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn(() => Promise.resolve());
    const signOut = vi.fn(() => Promise.resolve());
    state.session = makeSession({ me: null, error: new Error('Failed to fetch'), refresh, signOut });
    renderAt('/events');
    expect(screen.getByRole('heading', { level: 1, name: 'We could not check your account' })).toBeInTheDocument();
    expect(screen.getByTestId('session-error')).toHaveTextContent('Unable to connect to server. Please check your internet connection and try again.');
    expect(screen.queryByTestId('not-admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Console events')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('raises the reason when trying again fails too', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    const listener = (event: Event) => {
      if (event instanceof CustomEvent) seen.push(String(event.detail?.message ?? ''));
    };
    globalThis.addEventListener('duncit:notify', listener);
    state.session = makeSession({ me: null, error: new Error('Failed to fetch'), refresh: () => Promise.reject(new Error('Still offline')) });
    renderAt('/events');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(seen).toContain('Still offline'));
    globalThis.removeEventListener('duncit:notify', listener);
  });

  it('shows a signed-in non-admin the no-access notice with a way out', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn(() => Promise.resolve());
    state.session = makeSession({ me: makeMe({ email: 'ravi@lite.example', is_admin: false }), signOut });
    renderAt('/events');
    expect(screen.getByRole('heading', { level: 1, name: 'No console access' })).toBeInTheDocument();
    expect(screen.getByTestId('not-admin')).toHaveTextContent('This account is not a Lite admin. Ask an admin to add your email under Settings.');
    expect(screen.getByText('Signed in as ravi@lite.example')).toBeInTheDocument();
    expect(screen.queryByText('Console events')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
