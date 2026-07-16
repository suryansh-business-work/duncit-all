import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const useQueryMock = vi.hoisted(() => vi.fn());
const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: useQueryMock,
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));
vi.mock('@duncit/ui', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  StatCard: ({
    label,
    value,
    onClick,
  }: {
    label: string;
    value: number;
    onClick: () => void;
  }) => (
    <button type="button" data-testid={`stat-${label}`} onClick={onClick}>
      {label}:{String(value)}
    </button>
  ),
}));

import DashboardPage from '../../src/pages/DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    navigateSpy.mockReset();
  });

  it('shows a spinner while loading with no cached stats', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    render(<DashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('stat-Total challenges')).not.toBeInTheDocument();
  });

  it('renders stat cards and navigates to /challenges on click; missing keys fall back to 0', () => {
    useQueryMock.mockReturnValue({ data: { challengeStats: { total: 5 } }, loading: false });
    render(<DashboardPage />);

    expect(screen.getByTestId('stat-Total challenges')).toHaveTextContent('Total challenges:5');
    // `active` is absent → nullish-coalesced to 0.
    expect(screen.getByTestId('stat-Active challenges')).toHaveTextContent('Active challenges:0');

    fireEvent.click(screen.getByTestId('stat-Total challenges'));
    expect(navigateSpy).toHaveBeenCalledWith('/challenges');
  });

  it('keeps the cards visible when refetching with cached stats present', () => {
    useQueryMock.mockReturnValue({
      data: { challengeStats: { total: 8, active: 3 } },
      loading: true,
    });
    render(<DashboardPage />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('stat-Active challenges')).toHaveTextContent('Active challenges:3');
  });
});
