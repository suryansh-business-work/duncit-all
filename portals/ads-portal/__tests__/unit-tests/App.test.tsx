import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../src/App';
import { setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>LOGIN PAGE</div> }));
vi.mock('../../src/pages/DashboardPage', () => ({ default: () => <div>DASHBOARD PAGE</div> }));
vi.mock('../../src/pages/ads/MyAdsPage', () => ({ default: () => <div>MY ADS PAGE</div> }));
vi.mock('../../src/pages/ads/AdDetailsPage', () => ({ default: () => <div>AD DETAILS PAGE</div> }));
vi.mock('../../src/pages/create-ad-page/CreateAdPage', () => ({
  default: () => <div>CREATE AD PAGE</div>,
}));
vi.mock('@duncit/dialogs', () => ({ NotifyHost: () => <div data-testid="notify-host" /> }));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  ProfilePage: () => <div>PROFILE PAGE</div>,
}));

afterEach(() => clearToken());

describe('App routing', () => {
  it('redirects unauthenticated visitors to the login page', () => {
    renderWithProviders(<App />, { initialEntries: ['/ads'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the dashboard inside the shell when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('DASHBOARD PAGE')).toBeInTheDocument();
  });

  it('renders My Ads behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/ads'] });
    expect(screen.getByText('MY ADS PAGE')).toBeInTheDocument();
  });

  it('renders Create Ad behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/ads/new'] });
    expect(screen.getByText('CREATE AD PAGE')).toBeInTheDocument();
  });

  it('renders Ad Details behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/ads/abc123'] });
    expect(screen.getByText('AD DETAILS PAGE')).toBeInTheDocument();
  });

  it('renders the shared profile page behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/profile'] });
    expect(screen.getByText('PROFILE PAGE')).toBeInTheDocument();
  });

  it('shows the login route directly without auth', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('always mounts the notify host', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByTestId('notify-host')).toBeInTheDocument();
  });

  it('redirects unknown routes to the dashboard', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/nope'] });
    expect(screen.getByText('DASHBOARD PAGE')).toBeInTheDocument();
  });
});
