import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders } from '../testkit';

vi.mock('../../src/pages/dashboard', () => ({ default: () => <div>ADS OVERVIEW</div> }));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  WelcomeDashboard: ({ name, tagline, children }: { name: string; tagline: string; children: ReactNode }) => (
    <div data-testid="welcome">
      <span data-testid="name">{name}</span>
      <span data-testid="tagline">{tagline}</span>
      {children}
    </div>
  ),
}));

describe('DashboardPage', () => {
  it('greets with the portal name and hosts the ads overview', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('name')).toHaveTextContent('Ads');
    expect(screen.getByTestId('tagline')).toHaveTextContent(/campaigns/i);
    expect(screen.getByText('ADS OVERVIEW')).toBeInTheDocument();
  });
});
