import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  ProfilePage: () => <div>profile-page</div>,
  // Identity auth wrapper that still exercises App's `wrap` slot.
  createAuthed:
    ({ wrap }: { wrap: (el: JSX.Element) => JSX.Element }) =>
    (el: JSX.Element) =>
      wrap(el),
}));

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../../src/pages/DashboardPage', () => ({ default: () => <div>dashboard-page</div> }));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>login-page</div> }));
vi.mock('../../src/pages/api-keys/ApiKeysPage', () => ({ default: () => <div>api-keys-page</div> }));
vi.mock('../../src/pages/api-docs/ApiDocsPage', () => ({ default: () => <div>api-docs-page</div> }));

import App from '../../src/App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App routing', () => {
  it('renders the dashboard (in the shell) at /', () => {
    renderAt('/');
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('shell')).toBeInTheDocument();
  });

  it('renders API keys at /keys', () => {
    renderAt('/keys');
    expect(screen.getByText('api-keys-page')).toBeInTheDocument();
    expect(screen.getByTestId('shell')).toBeInTheDocument();
  });

  it('renders API docs at /docs', () => {
    renderAt('/docs');
    expect(screen.getByText('api-docs-page')).toBeInTheDocument();
  });

  it('renders the profile page at /profile', () => {
    renderAt('/profile');
    expect(screen.getByText('profile-page')).toBeInTheDocument();
  });

  it('renders login without the shell chrome at /login', () => {
    renderAt('/login');
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('redirects any unknown path back to /', () => {
    renderAt('/nope/unknown');
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
  });
});
