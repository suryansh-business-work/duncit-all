import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/shell', () => ({
  // createAuthed here calls wrap() so App's `(el) => <AppShell>{el}</AppShell>`
  // arrow is exercised; the shell chrome itself is stubbed below.
  createAuthed: (opts: Readonly<{ wrap: (el: JSX.Element) => JSX.Element }>) =>
    (el: JSX.Element) => opts.wrap(el),
  ProfilePage: () => <div data-testid="profile" />,
}));

vi.mock('../components/AppShell', () => ({
  default: ({ children }: Readonly<{ children: React.ReactNode }>) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('../pages/DashboardPage', () => ({ default: () => <div data-testid="dashboard" /> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div data-testid="login" /> }));
vi.mock('../lib/session', () => ({ getToken: () => 'tok' }));

import App from '../App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App routes', () => {
  it('renders the dashboard inside the shell at /', () => {
    renderAt('/');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('dashboard'));
  });

  it('renders the login page (no shell) at /login', () => {
    renderAt('/login');
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('renders the profile page inside the shell at /profile', () => {
    renderAt('/profile');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('profile'));
  });

  it('redirects unknown paths to the dashboard', () => {
    renderAt('/nowhere');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
