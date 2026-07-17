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
vi.mock('../../src/pages/sos/SosListPage', () => ({ default: () => <div>SOS LIST</div> }));
vi.mock('../../src/pages/sos/SosDetailsPage', () => ({ default: () => <div>SOS DETAIL</div> }));
vi.mock('../../src/pages/callbacks/CallbacksListPage', () => ({ default: () => <div>CB LIST</div> }));
vi.mock('../../src/pages/callbacks/CallbackDetailsPage', () => ({ default: () => <div>CB DETAIL</div> }));
vi.mock('../../src/pages/feedback/FeedbackListPage', () => ({ default: () => <div>FB LIST</div> }));
vi.mock('../../src/pages/feedback/FeedbackDetailsPage', () => ({ default: () => <div>FB DETAIL</div> }));
vi.mock('../../src/pages/tickets/TicketsListPage', () => ({ default: () => <div>TK LIST</div> }));
vi.mock('../../src/pages/tickets/TicketDetailPage', () => ({ default: () => <div>TK DETAIL</div> }));
vi.mock('../../src/pages/live-chat/LiveChatPage', () => ({ default: () => <div>LIVE CHAT</div> }));

afterEach(() => clearToken());

describe('App routing', () => {
  it('redirects unauthenticated visitors to the login page', () => {
    renderWithProviders(<App />, { initialEntries: ['/sos'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the dashboard inside the shell when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('DASH')).toBeInTheDocument();
  });

  it('renders a detail route behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/tickets/abc123'] });
    expect(screen.getByText('TK DETAIL')).toBeInTheDocument();
  });

  it('renders the live chat route', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/live-chat'] });
    expect(screen.getByText('LIVE CHAT')).toBeInTheDocument();
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
