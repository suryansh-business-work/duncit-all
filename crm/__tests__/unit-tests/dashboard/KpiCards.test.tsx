import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCards from '@/pages/dashboard/KpiCards';

describe('KpiCards', () => {
  it('renders all five tiles with the supplied values', () => {
    render(
      <KpiCards
        venueCount={12}
        hostCount={8}
        totalCount={20}
        conversionRate={25}
        uniqueServices={4}
      />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/venue leads/i)).toBeInTheDocument();
    expect(screen.getByText(/services offered/i)).toBeInTheDocument();
  });

  it('shows skeletons when loading and counts are still zero', () => {
    const { container } = render(
      <KpiCards
        venueCount={0}
        hostCount={0}
        totalCount={0}
        conversionRate={0}
        uniqueServices={0}
        loading
      />
    );
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });
});
