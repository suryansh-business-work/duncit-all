import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueOverviewCard from './VenueOverviewCard';
import type { AdminVenueDetails } from './queries';

const base: AdminVenueDetails = {
  id: '1',
  venue_name: 'The Loft',
  venue_type: 'CAFE',
  description: 'Cosy rooftop',
  cover_image_url: 'https://img/loft.jpg',
  capacity: 40,
  status: 'APPROVED',
  city: 'Pune',
  state: 'MH',
  locality: 'Kothrud',
  country: 'India',
  postal_code: '411038',
  address_line1: '12 MG Road',
  owner_name: 'Asha',
  owner_email: 'a@b.com',
  owner_phone: '999',
  tags: ['rooftop', 'wifi'],
  submitted_at: null,
  approved_at: null,
};

describe('VenueOverviewCard', () => {
  it('renders status, location, owner and tags for a full venue', () => {
    render(<VenueOverviewCard venue={base} />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Capacity 40')).toBeInTheDocument();
    expect(screen.getByText(/Kothrud, Pune, MH, India/)).toBeInTheDocument();
    expect(screen.getByText('rooftop')).toBeInTheDocument();
    expect(screen.getByText(/Owner: Asha/)).toBeInTheDocument();
  });

  it('falls back gracefully when optional fields are missing', () => {
    render(
      <VenueOverviewCard
        venue={{
          ...base,
          status: 'DRAFT',
          cover_image_url: '',
          description: '',
          address_line1: '',
          capacity: 0,
          locality: '',
          city: '',
          state: '',
          country: '',
          postal_code: '',
          tags: [],
          owner_name: '',
          owner_phone: '',
          owner_email: '',
        }}
      />,
    );
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('Location not set')).toBeInTheDocument();
    expect(screen.getByText(/Owner: —/)).toBeInTheDocument();
  });
});
