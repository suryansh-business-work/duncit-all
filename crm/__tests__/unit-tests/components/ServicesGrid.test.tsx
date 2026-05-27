import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServicesGrid from '@/components/ServicesGrid';

describe('ServicesGrid', () => {
  it('shows the empty state when there are no services', () => {
    render(<ServicesGrid services={[]} />);
    expect(screen.getByText(/no services tagged yet/i)).toBeInTheDocument();
  });

  it('renders catalogue values with their description', () => {
    render(
      <ServicesGrid
        services={[{ service: 'Catering', custom_name: '', description: 'Veg + non-veg' }]}
      />
    );
    expect(screen.getByText('Catering')).toBeInTheDocument();
    expect(screen.getByText('Veg + non-veg')).toBeInTheDocument();
  });

  it('uses custom_name and labels Other rows as Custom', () => {
    render(
      <ServicesGrid
        services={[{ service: 'Other', custom_name: 'Drone Photography', description: '' }]}
      />
    );
    expect(screen.getByText('Drone Photography')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText(/no description/i)).toBeInTheDocument();
  });

  it('falls back to "Other" when custom_name is blank', () => {
    render(<ServicesGrid services={[{ service: 'Other', custom_name: '', description: '' }]} />);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
