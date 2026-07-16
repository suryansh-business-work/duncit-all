import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: { message?: string }) => `ERR:${e?.message ?? ''}` }));

import { useQuery } from '@apollo/client';
import { WelcomeDashboard } from '../src/dashboard/WelcomeDashboard';

const mockQuery = vi.mocked(useQuery);
const set = (v: unknown) => mockQuery.mockReturnValue(v as never);

describe('WelcomeDashboard', () => {
  beforeEach(() => mockQuery.mockReset());

  it('shows a spinner while loading with no cached user', () => {
    set({ data: undefined, loading: true, error: undefined });
    render(<WelcomeDashboard name="HR" tagline="Hi" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error alert', () => {
    set({ data: undefined, loading: false, error: { message: 'boom' } });
    render(<WelcomeDashboard name="HR" tagline="Hi" />);
    expect(screen.getByText('ERR:boom')).toBeInTheDocument();
  });

  it('greets by first name, lists role chips, module cards and children', () => {
    set({
      data: { me: { first_name: 'Ada', roles: ['ADMIN', 'HR_MANAGER'] } },
      loading: false,
      error: undefined,
    });
    render(
      <WelcomeDashboard name="HR" tagline="Welcome" modules={[{ title: 'Payroll', description: 'Pay', icon: 'payments' }]}>
        <div>custom-body</div>
      </WelcomeDashboard>,
    );
    expect(screen.getByText('Welcome back, Ada')).toBeInTheDocument();
    expect(screen.getByText('HR MANAGER')).toBeInTheDocument();
    expect(screen.getByText('custom-body')).toBeInTheDocument();
    expect(screen.getByText('HR modules')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
  });

  it('derives the first name from full_name and omits the modules grid', () => {
    set({ data: { me: { full_name: 'Grace Hopper' } }, loading: false, error: undefined });
    render(<WelcomeDashboard name="HR" tagline="Hi" />);
    expect(screen.getByText('Welcome back, Grace')).toBeInTheDocument();
    expect(screen.queryByText('HR modules')).not.toBeInTheDocument();
  });

  it('falls back to "there" and renders even while re-validating a cached user', () => {
    set({ data: { me: {} }, loading: true, error: undefined });
    render(<WelcomeDashboard name="HR" tagline="Hi" />);
    expect(screen.getByText('Welcome back, there')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
