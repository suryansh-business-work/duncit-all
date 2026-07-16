import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// createAuthed applies the portal's `wrap` (AppShell) around each protected
// element, matching the real factory, so App's wrap arrow is exercised.
vi.mock('@duncit/shell', () => ({
  createAuthed: (opts: { wrap: (el: React.ReactNode) => React.ReactNode }) => (el: React.ReactNode) =>
    opts.wrap(el),
  ProfilePage: () => <div>profile-page</div>,
}));

vi.mock('@duncit/dialogs', () => ({
  NotifyHost: () => <div>notify-host</div>,
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
vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../src/lib/session', () => ({ getToken: () => 'tok' }));

import App from '../../src/App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App routing', () => {
  it.each([
    ['/', 'welcome-page'],
    ['/login', 'login-page'],
    ['/profile', 'profile-page'],
    ['/campaigns/email', 'campaigns-EMAIL'],
    ['/campaigns/whatsapp', 'campaigns-WHATSAPP'],
    ['/notifications', 'notifications-page'],
    ['/ads-approvals', 'ads-approvals-page'],
    ['/ads-settings', 'ads-settings-page'],
  ])('renders %s', (path, text) => {
    renderAt(path);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('mounts the global NotifyHost', () => {
    renderAt('/');
    expect(screen.getByText('notify-host')).toBeInTheDocument();
  });

  it('redirects unknown routes to the dashboard', () => {
    renderAt('/does-not-exist');
    expect(screen.getByText('welcome-page')).toBeInTheDocument();
  });
});
