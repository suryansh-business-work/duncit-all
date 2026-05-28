import { afterEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { getToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

const glogin = vi.hoisted(() => ({ props: null as any }));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: any) => {
    glogin.props = props;
    return <button data-testid="glogin" onClick={() => props.onSuccess({ credential: 'id-token' })}>Google</button>;
  },
}));

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;
const LOGIN_GOOGLE = gql`
  mutation ConsoleLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

const loginResult = (token: string | null, roles: string[]) => ({
  request: { query: LOGIN },
  variableMatcher: () => true,
  result: { data: { login: token ? { token, user: { user_id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', roles } } : { token: null, user: null } } },
});

const renderLogin = (mocks: any[], initialEntries: any[] = ['/login']) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries,
    routes: (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/documents" element={<div>DOCS HOME</div>} />
      </>
    ),
  });

const submitLogin = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'legal@duncit.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /open legal console/i }));
};

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('LoginPage', () => {
  it('renders the sign-in form', async () => {
    renderLogin([]);
    expect(await screen.findByText(/sign in to duncit legal/i)).toBeInTheDocument();
  });

  it('warns when redirected after an access denial', async () => {
    renderLogin([], ['/login?denied=1']);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('logs in and navigates to the default route', async () => {
    renderLogin([loginResult('tok', ['LEGAL_MANAGER'])]);
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(getToken()).toBe('tok');
  });

  it('honours a safe redirect query param', async () => {
    renderLogin([loginResult('tok', ['LEGAL_MANAGER'])], ['/login?redirect=%2Fdocuments']);
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText('DOCS HOME')).toBeInTheDocument());
  });

  it('falls back to the originating location from router state', async () => {
    renderLogin(
      [loginResult('tok', ['LEGAL_MANAGER'])],
      [{ pathname: '/login', search: '', state: { from: { pathname: '/documents', search: '', hash: '' } } } as any]
    );
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText('DOCS HOME')).toBeInTheDocument());
  });

  it('shows an access-denied error for an unauthorised role', async () => {
    renderLogin([loginResult('tok', ['SOMETHING_ELSE'])]);
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText(/do not have access/i)).toBeInTheDocument());
  });

  it('shows an error when the server returns no token', async () => {
    renderLogin([loginResult(null, [])]);
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument());
  });

  it('surfaces a GraphQL login error', async () => {
    renderLogin([
      { request: { query: LOGIN }, variableMatcher: () => true, result: { errors: [{ message: 'Invalid email or password' }] } },
    ]);
    await screen.findByText(/sign in to duncit legal/i);
    submitLogin();
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });

  it('logs in with Google', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    renderLogin([
      { request: { query: LOGIN_GOOGLE }, variableMatcher: () => true, result: { data: { loginWithGoogle: { token: 'tok', user: { user_id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', roles: ['LEGAL_MANAGER'] } } } } },
    ]);
    await screen.findByText(/sign in to duncit legal/i);
    fireEvent.click(screen.getByTestId('glogin'));
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
  });

  it('shows a friendly error when the Google account is unknown', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    renderLogin([
      { request: { query: LOGIN_GOOGLE }, variableMatcher: () => true, result: { errors: [{ message: 'nope', extensions: { code: 'GOOGLE_ACCOUNT_NOT_FOUND' } }] } },
    ]);
    await screen.findByText(/sign in to duncit legal/i);
    fireEvent.click(screen.getByTestId('glogin'));
    await waitFor(() => expect(screen.getByText(/google account not found/i)).toBeInTheDocument());
  });

  it('surfaces other Google errors via the generic parser', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    renderLogin([
      { request: { query: LOGIN_GOOGLE }, variableMatcher: () => true, result: { errors: [{ message: 'Google service unavailable' }] } },
    ]);
    await screen.findByText(/sign in to duncit legal/i);
    fireEvent.click(screen.getByTestId('glogin'));
    await waitFor(() => expect(screen.getByText(/google service unavailable/i)).toBeInTheDocument());
  });
});
