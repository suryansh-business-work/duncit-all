import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueLocationCard from '../VenueLocationCard';
import { makeVenue } from './fixtures';

/** The InfoRow whose caption is `label` (captions render as spans; the card
 * title is a heading, so the two "Location" texts never collide). */
const row = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;

describe('VenueLocationCard', () => {
  it('reads the street address, the location line, the PIN code and the coordinates', () => {
    render(<VenueLocationCard venue={makeVenue()} />);

    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument();
    expect(row('Address')).toHaveTextContent('12 100 Feet Road, HAL 2nd Stage');
    expect(row('Location')).toHaveTextContent('Indiranagar, Bengaluru, Karnataka, India');
    expect(row('PIN code')).toHaveTextContent('560038');
    expect(row('Coordinates')).toHaveTextContent('12.9716, 77.6412');
  });

  it('dashes an unfiled address, PIN and pin, and says the location is not set', () => {
    render(
      <VenueLocationCard
        venue={makeVenue({
          address_line1: '',
          address_line2: '',
          locality: '',
          city: '',
          state: '',
          country: '',
          postal_code: '',
          lat: 12.9716,
          lng: null,
        })}
      />,
    );

    expect(row('Address')).toHaveTextContent('Address—');
    expect(row('Location')).toHaveTextContent('Location not set');
    expect(row('PIN code')).toHaveTextContent('PIN code—');
    expect(row('Coordinates')).toHaveTextContent('Coordinates—');
  });

  it('needs both coordinates before it shows a pin', () => {
    render(<VenueLocationCard venue={makeVenue({ lat: undefined, lng: 77.6412 })} />);

    expect(row('Coordinates')).toHaveTextContent('Coordinates—');
  });
});
