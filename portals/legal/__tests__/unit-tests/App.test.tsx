import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../src/App';
import { setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>LOGIN PAGE</div> }));
vi.mock('../../src/pages/DashboardPage', () => ({ default: () => <div>DASH</div> }));
vi.mock('../../src/pages/documents/DocumentsListPage', () => ({ default: () => <div>DOC LIST</div> }));
vi.mock('../../src/pages/documents/DocumentDetailPage', () => ({ default: () => <div>DOC DETAIL</div> }));
vi.mock('../../src/pages/policies/PoliciesPage', () => ({ default: () => <div>POLICIES</div> }));

afterEach(() => clearToken());

describe('App routing', () => {
  it('redirects unauthenticated visitors to the login page', () => {
    renderWithProviders(<App />, { initialEntries: ['/documents'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the dashboard inside the shell when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('DASH')).toBeInTheDocument();
  });

  it('renders the documents list and a document detail route', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/documents'] });
    expect(screen.getByText('DOC LIST')).toBeInTheDocument();
  });

  it('renders a document detail route behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/documents/abc123'] });
    expect(screen.getByText('DOC DETAIL')).toBeInTheDocument();
  });

  it('renders the policies route', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/policies'] });
    expect(screen.getByText('POLICIES')).toBeInTheDocument();
  });

  it('redirects unknown routes to the dashboard', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/nope'] });
    expect(screen.getByText('DASH')).toBeInTheDocument();
  });

  it('shows the login route directly', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });
});
