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
vi.mock('../../src/pages/dashboard-page/DashboardPage', () => ({
  default: () => <div>welcome-page</div>,
}));
vi.mock('../../src/pages/contacts-page', () => ({
  default: () => <div>contacts-page</div>,
}));
vi.mock('../../src/pages/target-audience-page/AudienceListsPage', () => ({
  default: () => <div>audience-lists-page</div>,
}));
vi.mock('../../src/pages/target-audience-page/CreateAudienceListPage', () => ({
  default: () => <div>create-audience-list-page</div>,
}));
vi.mock('../../src/pages/target-audience-page/AudienceListDetailPage', () => ({
  default: () => <div>audience-list-detail-page</div>,
}));
vi.mock('../../src/pages/marketing-campaigns-page/MarketingCampaignsPage', () => ({
  default: () => <div>campaigns-page</div>,
}));
vi.mock('../../src/pages/notifications-page/NotificationsPage', () => ({
  default: () => <div>notifications-page</div>,
}));
vi.mock('../../src/pages/ads-approvals-page/AdsApprovalsPage', () => ({
  default: () => <div>ads-approvals-page</div>,
}));
vi.mock('../../src/pages/live-ads-page/LiveAdsPage', () => ({
  default: () => <div>live-ads-page</div>,
}));
vi.mock('../../src/pages/ads-settings-page/AdsSettingsPage', () => ({
  default: () => <div>ads-settings-page</div>,
}));
vi.mock('../../src/pages/settings-page/IntegrationsPage', () => ({
  default: () => <div>integrations-page</div>,
}));
// Shows where it landed, so a redirect can be seen to keep the query string.
vi.mock('../../src/pages/social-accounts-page', async () => {
  const { useLocation } = await import('react-router');
  return {
    default: () => {
      const { search } = useLocation();
      return <div>social-accounts-page{search}</div>;
    },
  };
});
vi.mock('../../src/pages/social-calendar-page', () => ({
  default: () => <div>social-calendar-page</div>,
}));
vi.mock('../../src/pages/instagram-leads-page', () => ({
  default: () => <div>instagram-leads-page</div>,
}));
vi.mock('../../src/pages/activity-page', () => ({ default: () => <div>activity-page</div> }));
vi.mock('../../src/pages/approvals-page', () => ({ default: () => <div>approvals-page</div> }));
vi.mock('../../src/pages/tasks-page', () => ({ default: () => <div>tasks-page</div> }));

afterEach(() => {
  clearToken();
});

describe('App routing', () => {
  it.each([
    ['/', 'welcome-page'],
    ['/tasks', 'tasks-page'],
    ['/approvals', 'approvals-page'],
    ['/activity', 'activity-page'],
    ['/profile', 'profile-page'],
    ['/analytics/contacts', 'contacts-page'],
    ['/audience', 'audience-lists-page'],
    ['/audience/new', 'create-audience-list-page'],
    ['/audience/l1', 'audience-list-detail-page'],
    ['/campaigns/email', 'campaigns-page'],
    ['/notifications', 'notifications-page'],
    ['/ads-approvals', 'ads-approvals-page'],
    ['/live-ads', 'live-ads-page'],
    ['/ads-settings', 'ads-settings-page'],
    ['/social/accounts', 'social-accounts-page'],
    ['/publish/calendar', 'social-calendar-page'],
    ['/leads/instagram', 'instagram-leads-page'],
    ['/settings/integrations', 'integrations-page'],
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

  it.each([
    ['/social-accounts', 'social-accounts-page'],
    ['/social-calendar', 'social-calendar-page'],
    ['/instagram-leads', 'instagram-leads-page'],
    ['/contacts', 'contacts-page'],
  ])('sends the old address %s to the page that moved', (path, text) => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: [path] });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // The OAuth callback still lands on the old address; what it carries must survive the move.
  it('keeps the query string when an old address redirects', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/social-accounts?connected=LINKEDIN&count=2'] });
    expect(screen.getByText('social-accounts-page?connected=LINKEDIN&count=2')).toBeInTheDocument();
  });
});
