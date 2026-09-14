import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueAboutCard from '../VenueAboutCard';
import { makeVenue, missing } from './fixtures';

/** The InfoRow whose caption is `label`, so a value is read from its own row. */
const row = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe('VenueAboutCard', () => {
  it("shows the owner's description, the category path, each named space and every amenity list", () => {
    render(<VenueAboutCard venue={makeVenue()} />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Two floors of board games in Indiranagar.')).toBeInTheDocument();
    expect(row('Category')).toHaveTextContent('For You > Games > Board Games');
    expect(row('Terrace')).toHaveTextContent('24');
    expect(row('Loft')).toHaveTextContent('16');
    expect(row('Amenities')).toHaveTextContent('Wi-Fi');
    expect(row('Facilities')).toHaveTextContent('Parking');
    expect(row('Security')).toHaveTextContent('CCTV');
    expect(row('Tags')).toHaveTextContent('cozy');
    expect(screen.queryByText('No named spaces — the venue is booked as a whole.')).not.toBeInTheDocument();
  });

  it('reads the empty copy for a venue with no description, no spaces and empty lists', () => {
    render(
      <VenueAboutCard
        venue={makeVenue({ description: '', capacity_items: [], amenities: [], facilities: [], security: [], tags: [] })}
      />,
    );

    expect(screen.getByText('No description added yet.')).toBeInTheDocument();
    expect(screen.getByText('No named spaces — the venue is booked as a whole.')).toBeInTheDocument();
    for (const label of ['Amenities', 'Facilities', 'Security', 'Tags']) {
      expect(row(label)).toHaveTextContent(`${label}—`);
    }
  });

  it('treats lists the record never filled in as empty', () => {
    const { container } = render(
      <VenueAboutCard
        venue={makeVenue({
          capacity_items: missing<[]>(),
          amenities: missing<string[]>(),
          facilities: missing<string[]>(),
          security: missing<string[]>(),
          tags: missing<string[]>(),
        })}
      />,
    );

    expect(screen.getByText('No named spaces — the venue is booked as a whole.')).toBeInTheDocument();
    for (const label of ['Amenities', 'Facilities', 'Security', 'Tags']) {
      expect(row(label)).toHaveTextContent(`${label}—`);
    }
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0);
  });
});
