import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ token: 'tok' as string | null }));

vi.mock('@duncit/shell', () => ({
  createAuthed: (opts: { getToken: () => string | null; wrap: (el: React.ReactNode) => React.ReactNode }) =>
    (el: React.ReactNode) => (opts.getToken() ? opts.wrap(el) : <div>need-login</div>),
  ProfilePage: () => <div>profile-page</div>,
}));
vi.mock('@duncit/dialogs', () => ({ NotifyHost: () => <div data-testid="notify-host" /> }));
vi.mock('./components/AppShell', () => ({ default: (p: { children: React.ReactNode }) => <div data-testid="shell">{p.children}</div> }));
vi.mock('./lib/session', () => ({ getToken: () => m.token }));
vi.mock('./pages/LoginPage', () => ({ default: () => <div>login-page</div> }));
vi.mock('./pages/environment', () => ({ default: () => <div>environment-page</div> }));
vi.mock('./pages/portal-modes', () => ({ default: () => <div>portal-modes-page</div> }));
vi.mock('./pages/feature-flags-page/FeatureFlagsPage', () => ({ default: () => <div>feature-flags-page</div> }));
vi.mock('./pages/AuthenticationPage', () => ({ default: () => <div>authentication-page</div> }));
vi.mock('./pages/email-templates-page/EmailTemplatesPage', () => ({ default: () => <div>email-templates-page</div> }));
vi.mock('./pages/server/ServerInfoPage', () => ({ default: () => <div>server-info-page</div> }));
vi.mock('./pages/server/DockerPage', () => ({ default: () => <div>docker-page</div> }));

import App from './App';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => { m.token = 'tok'; });

describe('App routing', () => {
  it('renders the authed environment page at / inside the shell', () => {
    at('/');
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('environment-page')).toBeInTheDocument();
    expect(screen.getByTestId('notify-host')).toBeInTheDocument();
  });

  it('renders each named route', () => {
    at('/login');
    expect(screen.getByText('login-page')).toBeInTheDocument();
    at('/portal-modes');
    expect(screen.getByText('portal-modes-page')).toBeInTheDocument();
    at('/feature-flags');
    expect(screen.getByText('feature-flags-page')).toBeInTheDocument();
    at('/authentication');
    expect(screen.getByText('authentication-page')).toBeInTheDocument();
    at('/email-templates');
    expect(screen.getByText('email-templates-page')).toBeInTheDocument();
    at('/profile');
    expect(screen.getByText('profile-page')).toBeInTheDocument();
    at('/server/info');
    expect(screen.getByText('server-info-page')).toBeInTheDocument();
    at('/server/docker');
    expect(screen.getByText('docker-page')).toBeInTheDocument();
  });

  it('redirects /server to /server/info and unknown paths to /', () => {
    at('/server');
    expect(screen.getByText('server-info-page')).toBeInTheDocument();
    at('/totally-unknown');
    expect(screen.getByText('environment-page')).toBeInTheDocument();
  });

  it('shows the login fallback when unauthenticated', () => {
    m.token = null;
    at('/');
    expect(screen.getByText('need-login')).toBeInTheDocument();
  });
});
