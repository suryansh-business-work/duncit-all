import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { getToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';
import { loginResultMock } from '../mocks';

const ROLE = appConfig.requiredRoles[0];

const renderLogin = (mocks: MockedResponse[], initialEntries: string[] = ['/login']) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries,
    routes: (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/navigation" element={<div>NAV HOME</div>} />
      </>
    ),
  });

const submitLogin = () => {
  fireEvent.change(screen.getByPlaceholderText('e-mail address'), {
    target: { value: 'manager@duncit.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
};

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('LoginPage', () => {
  it('renders the login form', async () => {
    renderLogin([]);
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e-mail address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
  });

  it('warns when redirected after an access denial', async () => {
    renderLogin([], ['/login?denied=1']);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('logs in and navigates to the default route', async () => {
    renderLogin([loginResultMock('tok', [ROLE])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(getToken()).toBe('tok');
  });

  it('honours a safe redirect query param', async () => {
    renderLogin([loginResultMock('tok', [ROLE])], ['/login?redirect=%2Fnavigation']);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('NAV HOME')).toBeInTheDocument());
  });

  it('shows an access-denied error for an unauthorised role', async () => {
    renderLogin([loginResultMock('tok', ['SOMETHING_ELSE'])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/do not have access/i)).toBeInTheDocument());
  });

  it('shows an error when the server returns no token', async () => {
    renderLogin([loginResultMock(null, [])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument());
  });
});
