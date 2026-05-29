import { afterEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { getToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

const ROLE = appConfig.requiredRoles[0];

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

const loginResult = (token: string | null, roles: string[]) => ({
  request: { query: LOGIN },
  variableMatcher: () => true,
  result: {
    data: {
      login: token
        ? { token, user: { user_id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', roles } }
        : { token: null, user: null },
    },
  },
});

const renderLogin = (mocks: any[], initialEntries: any[] = ['/login']) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries,
    routes: (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/tickets" element={<div>TICKETS HOME</div>} />
      </>
    ),
  });

const submitLogin = () => {
  fireEvent.change(screen.getByPlaceholderText('e-mail address'), { target: { value: 'manager@duncit.com' } });
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

  it('toggles password visibility', async () => {
    renderLogin([]);
    const pwd = (await screen.findByPlaceholderText('password')) as HTMLInputElement;
    expect(pwd.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /toggle password visibility/i }));
    expect(pwd.type).toBe('text');
  });

  it('shows the forgot-password hint', async () => {
    renderLogin([]);
    fireEvent.click(await screen.findByRole('button', { name: /forgot password/i }));
    expect(await screen.findByText(/contact your administrator/i)).toBeInTheDocument();
  });

  it('warns when redirected after an access denial', async () => {
    renderLogin([], ['/login?denied=1']);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('logs in and navigates to the default route', async () => {
    renderLogin([loginResult('tok', [ROLE])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(getToken()).toBe('tok');
  });

  it('honours a safe redirect query param', async () => {
    renderLogin([loginResult('tok', [ROLE])], ['/login?redirect=%2Ftickets']);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('TICKETS HOME')).toBeInTheDocument());
  });

  it('falls back to the originating location from router state', async () => {
    renderLogin(
      [loginResult('tok', [ROLE])],
      [{ pathname: '/login', search: '', state: { from: { pathname: '/tickets', search: '', hash: '' } } } as any],
    );
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('TICKETS HOME')).toBeInTheDocument());
  });

  it('shows an access-denied error for an unauthorised role', async () => {
    renderLogin([loginResult('tok', ['SOMETHING_ELSE'])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/do not have access/i)).toBeInTheDocument());
  });

  it('shows an error when the server returns no token', async () => {
    renderLogin([loginResult(null, [])]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument());
  });

  it('surfaces a GraphQL login error', async () => {
    renderLogin([
      { request: { query: LOGIN }, variableMatcher: () => true, result: { errors: [{ message: 'Invalid email or password' }] } },
    ]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });
});
