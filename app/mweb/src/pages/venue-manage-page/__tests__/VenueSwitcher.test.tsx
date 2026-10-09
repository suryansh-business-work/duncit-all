import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VenueSwitcher from '../VenueSwitcher';

const hall = { id: 'v-hall', venue_name: 'Nestory Stays', city: 'Lucknow', status: 'APPROVED' };
const cafe = { id: 'v-cafe', venue_name: 'Cafe Delhi Heights', city: 'Lucknow', status: 'APPROVED' };

describe('VenueSwitcher', () => {
  it('shows nothing for a partner with no venues', () => {
    const { container } = render(<VenueSwitcher venues={[]} venueId={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the one venue a single-venue owner has, read-only', () => {
    const onChange = vi.fn();
    render(<VenueSwitcher venues={[hall]} venueId={null} onChange={onChange} />);
    const field = screen.getByLabelText('Venue');
    expect(field).toHaveValue('Nestory Stays');
    expect(field).toHaveAttribute('readonly');
    expect(screen.queryByTestId('venue-switcher')).not.toBeInTheDocument();
  });

  it('offers a dropdown once there is a venue to switch to', () => {
    render(<VenueSwitcher venues={[hall, cafe]} venueId="v-cafe" onChange={vi.fn()} />);
    expect(screen.getByTestId('venue-switcher')).toHaveTextContent('Cafe Delhi Heights');
    expect(screen.queryByTestId('venue-switcher-single')).not.toBeInTheDocument();
  });
});
