import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderWithProviders } from '../testkit';

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
vi.mock('../../src/pages/challenges/ChallengesPage', () => ({
  default: () => <div>challenges-page</div>,
}));

import App from '../../src/App';

const renderAt = (path: string) => renderWithProviders(<App />, { initialEntries: [path] });

describe('App routing', () => {
  it('renders the dashboard (in the shell) at /', () => {
    renderAt('/');
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('shell')).toBeInTheDocument();
  });

  it('renders challenges at /challenges', () => {
    renderAt('/challenges');
    expect(screen.getByText('challenges-page')).toBeInTheDocument();
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
