import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeadStatTile from '@/components/LeadStatTile';

describe('LeadStatTile', () => {
  it('renders label, value and hint', () => {
    // Label has `textTransform: uppercase` in CSS but the DOM text stays
    // mixed-case — match against the source string.
    render(<LeadStatTile label="Capacity" value="50 – 200" hint="Indoor / outdoor" />);
    expect(screen.getByText(/capacity/i)).toBeInTheDocument();
    expect(screen.getByText('50 – 200')).toBeInTheDocument();
    expect(screen.getByText('Indoor / outdoor')).toBeInTheDocument();
  });

  it('accepts numeric values', () => {
    render(<LeadStatTile label="Services" value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('omits the hint when not provided', () => {
    render(<LeadStatTile label="Services" value={0} />);
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });
});
