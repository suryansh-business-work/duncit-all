import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Route } from 'react-router-dom';
import App from '../../src/App';
import AppShell from '../../src/components/AppShell';
import LoginPage from '../../src/pages/LoginPage';
import { clearToken } from '../../src/lib/session';
import { resetUserContext, userContextControls } from './mocks/user-context';
import { renderWithProviders } from '../testkit';

describe('App routing', () => {
  it('mounts the login route and constructs every authed route', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByTestId('portal-login')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('renders the shared portal login page', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toBeInTheDocument();
  });
});

describe('AppShell adapter', () => {
  beforeEach(() => {
    resetUserContext();
    (clearToken as unknown as { mockClear: () => void }).mockClear();
  });

  it('passes an authenticated user + access flag through the shared shell', () => {
    userContextControls.user = { name: 'Fin Manager', roles: ['FINANCE_MANAGER'] };
    userContextControls.loading = false;
    renderWithProviders(<AppShell>content</AppShell>);
    expect(screen.getByTestId('shell-user')).toHaveTextContent('Fin Manager');
    expect(screen.getByTestId('shell-access')).toHaveTextContent('true');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('leaves access undefined while no user is present', () => {
    userContextControls.user = null;
    userContextControls.loading = true;
    renderWithProviders(<AppShell>content</AppShell>);
    expect(screen.getByTestId('shell-user')).toHaveTextContent('nouser');
    expect(screen.getByTestId('shell-access')).toHaveTextContent('undefined');
    expect(screen.getByTestId('shell-loading')).toHaveTextContent('true');
  });

  it('logs out: clears the token, calls context logout and navigates to /login', () => {
    userContextControls.user = { name: 'Fin', roles: [] };
    renderWithProviders(<AppShell>home</AppShell>, {
      path: '/',
      entry: '/',
      extra: <Route path="/login" element={<div data-testid="login-probe">login</div>} />,
    });
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(clearToken).toHaveBeenCalled();
    expect(userContextControls.logout).toHaveBeenCalled();
    expect(screen.getByTestId('login-probe')).toBeInTheDocument();
  });
});
