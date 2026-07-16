import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ---- LoginPage ----------------------------------------------------------
vi.mock('@duncit/shell', async (io) => {
  const actual = await io<typeof import('@duncit/shell')>();
  return {
    ...actual,
    PortalLoginPage: (p: { appConfig: { key: string }; session: unknown }) => (
      <div data-testid="portal-login">login:{p.appConfig.key}</div>
    ),
  };
});

// ---- JwtExpirySection deps ----------------------------------------------
const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as Error | undefined, refetch: vi.fn() },
  save: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useQuery: () => m.query, useMutation: () => [m.save, {}] as const };
});
vi.mock('@duncit/ui', () => ({
  QueryGuard: (p: { loading: boolean; error?: unknown; errorText?: string; children: React.ReactNode }) => {
    if (p.loading) return <div>guard-loading</div>;
    if (p.error) return <div>guard-error:{p.errorText}</div>;
    return <>{p.children}</>;
  },
}));

import LoginPage from './LoginPage';
import JwtExpirySection from './JwtExpirySection';

describe('LoginPage', () => {
  it('renders the shared portal login with this portal config', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveTextContent('login:tech');
  });
});

describe('JwtExpirySection', () => {
  beforeEach(() => {
    m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue({}) };
    m.save.mockReset();
    m.save.mockResolvedValue({});
  });

  it('renders a loading guard with no data', () => {
    m.query = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText('guard-loading')).toBeInTheDocument();
  });

  it('renders an error guard', () => {
    m.query = { data: undefined, loading: false, error: new Error('nope'), refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText('guard-error:nope')).toBeInTheDocument();
  });

  it('parses a "45m" expiry into minutes and updates the summary on change', () => {
    m.query = { data: { appSettings: { jwt_expires_in: '45m', jwt_no_expiry: false, updated_at: '2026-01-01T00:00:00.000Z' } }, loading: false, error: undefined, refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText(/expire after 45m/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '10' } });
    expect(screen.getByText(/expire after 10m/)).toBeInTheDocument();
    // clamps to a minimum of 1
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '0' } });
    expect(screen.getByText(/expire after 1m/)).toBeInTheDocument();
  });

  it('parses a numeric-seconds expiry into days', () => {
    m.query = { data: { appSettings: { jwt_expires_in: '172800', jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText(/expire after 2d/)).toBeInTheDocument();
  });

  it('falls back to 7 days for an unparseable expiry', () => {
    m.query = { data: { appSettings: { jwt_expires_in: 'weird', jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText(/expire after 7d/)).toBeInTheDocument();
  });

  it('defaults to 7 days when the expiry is null', () => {
    m.query = { data: { appSettings: { jwt_expires_in: null, jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: vi.fn() };
    render(<JwtExpirySection onToast={vi.fn()} />);
    expect(screen.getByText(/expire after 7d/)).toBeInTheDocument();
  });

  it('toggles never-expire, saves, and toasts', async () => {
    const onToast = vi.fn();
    m.query = { data: { appSettings: { jwt_expires_in: '7d', jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: m.query.refetch };
    render(<JwtExpirySection onToast={onToast} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText(/will not expire/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('JWT settings saved'));
  });

  it('changes the unit and saves a non-expiry value', async () => {
    const onToast = vi.fn();
    m.query = { data: { appSettings: { jwt_expires_in: '7d', jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: m.query.refetch };
    render(<JwtExpirySection onToast={onToast} />);
    fireEvent.mouseDown(screen.getByLabelText('Unit'));
    fireEvent.click(screen.getByRole('option', { name: 'Hours' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(m.save).toHaveBeenCalledWith({ variables: { input: { jwt_no_expiry: false, jwt_expires_in: '7h' } } }),
    );
  });

  it('surfaces a save error', async () => {
    m.query = { data: { appSettings: { jwt_expires_in: '7d', jwt_no_expiry: false, updated_at: null } }, loading: false, error: undefined, refetch: m.query.refetch };
    m.save.mockRejectedValue(new Error('save fail'));
    render(<JwtExpirySection onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('save fail')).toBeInTheDocument();
  });
});
