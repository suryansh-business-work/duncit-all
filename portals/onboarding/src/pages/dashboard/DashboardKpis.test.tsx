import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardKpis from './DashboardKpis';
import type { DashboardKpi } from './onboardingStats';

describe('DashboardKpis', () => {
  it('renders a card per KPI with its label and value across every tone', () => {
    const kpis: DashboardKpi[] = [
      { label: 'Total hosts', value: 6, tone: 'default' },
      { label: 'Pending review', value: 3, tone: 'warning' },
      { label: 'Approved', value: 7, tone: 'success' },
    ];
    render(<DashboardKpis kpis={kpis} />);
    expect(screen.getByText('Total hosts')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders nothing but an empty grid when there are no KPIs', () => {
    const { container } = render(<DashboardKpis kpis={[]} />);
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(0);
  });
});
