import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const stub = vi.hoisted(() => (name: string) => () => <div>{`page:${name}`}</div>);

vi.mock('../../src/runtime', () => ({
  runtime: {
    AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
    LoginPage: stub('login'),
    session: { getToken: () => 'token' },
  },
}));
vi.mock('@duncit/shell', async (io) => ({
  ...(await io<typeof import('@duncit/shell')>()),
  // The real helper redirects without a token; this one proves what App hands it.
  createAuthed: ({ wrap }: { wrap: (el: React.ReactNode) => React.ReactNode }) => (el: React.ReactNode) =>
    wrap(el),
  WelcomePage: stub('welcome'),
  ProfilePage: stub('profile'),
}));
vi.mock('../../src/pages/emails-dashboard', () => ({ default: stub('emails-dashboard') }));
vi.mock('../../src/pages/email-templates-page/EmailTemplatesPage', () => ({
  default: stub('email-templates'),
}));
vi.mock('../../src/pages/email-fragments-page', () => ({ default: stub('email-fragments') }));
vi.mock('../../src/pages/email-logs-page', () => ({ default: stub('email-logs') }));
vi.mock('../../src/pages/mail-automation', () => ({ default: stub('mail-automation') }));
vi.mock('../../src/pages/whatsapp-page', () => ({ default: stub('whatsapp') }));
vi.mock('../../src/pages/slack/SlackSettingsPage', () => ({ default: stub('slack') }));
vi.mock('../../src/pages/msg91-otp/logs', () => ({ default: stub('msg91-logs') }));
vi.mock('../../src/pages/msg91-otp/analytics', () => ({ default: stub('msg91-analytics') }));
vi.mock('../../../tech/src/pages/msg91-settings', () => ({ default: stub('msg91-settings') }));

import App from '../../src/App';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe('App routes', () => {
  it.each([
    ['/login', 'page:login'],
    ['/', 'page:welcome'],
    ['/profile', 'page:profile'],
    ['/emails/dashboard', 'page:emails-dashboard'],
    ['/emails/templates', 'page:email-templates'],
    ['/emails/fragments', 'page:email-fragments'],
    ['/emails/logs', 'page:email-logs'],
    ['/mail-automation', 'page:mail-automation'],
    ['/whatsapp', 'page:whatsapp'],
    ['/slack', 'page:slack'],
    ['/msg91-otp/logs', 'page:msg91-logs'],
    ['/msg91-otp/analytics', 'page:msg91-analytics'],
    ['/msg91-otp/settings', 'page:msg91-settings'],
  ])('mounts %s', (path, text) => {
    at(path);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('keeps every signed-in page inside the app shell, and the login page outside it', () => {
    const first = at('/slack');
    expect(screen.getByTestId('shell')).toHaveTextContent('page:slack');
    first.unmount();
    at('/login');
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('sends bare section URLs to their landing page', () => {
    const first = at('/emails');
    expect(screen.getByText('page:emails-dashboard')).toBeInTheDocument();
    first.unmount();
    at('/msg91-otp');
    expect(screen.getByText('page:msg91-logs')).toBeInTheDocument();
  });

  it('sends an unknown URL to the welcome page', () => {
    at('/nope/not-here');
    expect(screen.getByText('page:welcome')).toBeInTheDocument();
  });
});
