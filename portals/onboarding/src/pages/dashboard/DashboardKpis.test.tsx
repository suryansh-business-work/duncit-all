import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardKpis from './DashboardKpis';
import type { DashboardKpi } from './onboardingStats';

describe('DashboardKpis', () => {
  it('renders a card per KPI with its label and value across every tone', () => {
    const kpis: DashboardKpi[] = [
      { label: 'Total hosts', value: 6, tone: 'default', to: '/hosts' },
      { label: 'Total brands', value: 4, tone: 'default', to: '/ecomm-brands' },
      { label: 'Pending review', value: 3, tone: 'warning' },
      { label: 'Approved', value: 7, tone: 'success' },
    ];
    render(
      <MemoryRouter>
        <DashboardKpis kpis={kpis} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Total hosts')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Total brands')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // KPIs with a `to` navigate via CardActionArea → RouterLink; the rest render a plain card.
    expect(screen.getByRole('link', { name: /Total hosts/ })).toHaveAttribute('href', '/hosts');
    expect(screen.getByRole('link', { name: /Total brands/ })).toHaveAttribute('href', '/ecomm-brands');
    expect(screen.queryByRole('link', { name: /Pending review/ })).toBeNull();
  });

  it('renders nothing but an empty grid when there are no KPIs', () => {
    const { container } = render(<DashboardKpis kpis={[]} />);
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(0);
  });
});
