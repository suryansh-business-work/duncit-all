import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../src/App';
import { setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';

// Real `createAuthed` + real session gate; only the page bodies + toast host +
// shared ProfilePage are stubbed so routing is exercised end-to-end.
vi.mock('@duncit/dialogs', () => ({ NotifyHost: () => <div>notify-host</div> }));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  ProfilePage: () => <div>profile-page</div>,
}));
vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>login-page</div> }));
vi.mock('../../src/pages/WelcomePage', () => ({ default: () => <div>welcome-page</div> }));
vi.mock('../../src/pages/marketing-campaigns-page/MarketingCampaignsPage', () => ({
  default: ({ defaultChannel }: { defaultChannel?: string }) => <div>{`campaigns-${defaultChannel}`}</div>,
}));
vi.mock('../../src/pages/notifications-page/NotificationsPage', () => ({
  default: () => <div>notifications-page</div>,
}));
vi.mock('../../src/pages/ads-approvals-page/AdsApprovalsPage', () => ({
  default: () => <div>ads-approvals-page</div>,
}));
vi.mock('../../src/pages/ads-settings-page/AdsSettingsPage', () => ({
  default: () => <div>ads-settings-page</div>,
}));

afterEach(() => {
  clearToken();
});

describe('App routing', () => {
  it.each([
    ['/', 'welcome-page'],
    ['/profile', 'profile-page'],
    ['/campaigns/email', 'campaigns-EMAIL'],
    ['/campaigns/whatsapp', 'campaigns-WHATSAPP'],
    ['/notifications', 'notifications-page'],
    ['/ads-approvals', 'ads-approvals-page'],
    ['/ads-settings', 'ads-settings-page'],
  ])('renders %s behind auth', (path, text) => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: [path] });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows the login route without auth', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to the login page', () => {
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('mounts the global NotifyHost', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByText('notify-host')).toBeInTheDocument();
  });

  it('redirects unknown routes to the dashboard', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/does-not-exist'] });
    expect(screen.getByText('welcome-page')).toBeInTheDocument();
  });
});
