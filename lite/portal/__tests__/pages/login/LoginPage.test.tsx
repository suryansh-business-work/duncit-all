import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import type { LiteSessionValue } from '../../../../shared/session';
import { LoginPage } from '../../../pages/login';
import { makeSession } from '../../fixtures';
import { renderWithProviders } from '../../test-utils';

const state = vi.hoisted(() => ({ session: null as LiteSessionValue | null }));

vi.mock('../../../../shared/session', () => ({
  useLiteSession: () => {
    if (!state.session) throw new Error('session not set');
    return state.session;
  },
}));

beforeEach(() => {
  state.session = makeSession({ signedIn: false, me: null });
});

const renderLogin = () =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Dashboard home</p>} />
    </Routes>,
    { route: '/login' },
  );

describe('LoginPage', () => {
  it('shows the console sign-in for a visitor', () => {
    renderLogin();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Lite Console' })).toBeInTheDocument();
    expect(screen.getByText('Sign in with an admin account to run Duncit Lite.')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-email-form')).toBeInTheDocument();
  });

  it('waits on a loader while a stored session is checked', () => {
    state.session = makeSession({ signedIn: true, me: null, resolving: true });
    renderLogin();
    expect(screen.getByRole('status', { name: 'Checking your session…' })).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-email-form')).not.toBeInTheDocument();
  });

  it('sends a signed-in account to the dashboard', () => {
    state.session = makeSession();
    renderLogin();
    expect(screen.getByText('Dashboard home')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lite Console' })).not.toBeInTheDocument();
  });
});
