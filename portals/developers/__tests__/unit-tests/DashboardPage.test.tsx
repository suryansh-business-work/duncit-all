import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));

import DashboardPage from '../../src/pages/DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
  });

  it('renders the heading and both navigation tiles', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Developers' })).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
  });

  it('navigates to /keys when the API Keys tile is clicked', () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByText('API Keys'));
    expect(navigateSpy).toHaveBeenCalledWith('/keys');
  });

  it('navigates to /docs when the API Reference tile is clicked', () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByText('API Reference'));
    expect(navigateSpy).toHaveBeenCalledWith('/docs');
  });
});
