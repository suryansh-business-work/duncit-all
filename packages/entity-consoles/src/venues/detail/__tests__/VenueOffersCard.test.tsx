import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueOffersCard from '../VenueOffersCard';
import VenueOperationsTab from '../VenueOperationsTab';
import { venueSettings } from './fixtures';

const EFFECTIVE = { min_guests: 12, response_hours: 48 };

describe('VenueOffersCard', () => {
  it('states the venue’s own values as they are in effect', () => {
    render(<VenueOffersCard own={EFFECTIVE} effective={EFFECTIVE} />);
    expect(screen.getByText('Booking offers')).toBeInTheDocument();
    expect(screen.getByText('12 guests')).toBeInTheDocument();
    expect(screen.getByText('48 hours')).toBeInTheDocument();
    expect(screen.queryByText(/Duncit’s default/)).not.toBeInTheDocument();
  });

  // 0 = the venue left it to Duncit; the card says so beside what that is now.
  it('says when a value is Duncit’s default rather than the venue’s own', () => {
    render(<VenueOffersCard own={{ min_guests: 0, response_hours: 48 }} effective={{ min_guests: 8, response_hours: 48 }} />);
    expect(screen.getByText('8 guests · Duncit’s default')).toBeInTheDocument();
    expect(screen.getByText('48 hours')).toBeInTheDocument();
  });

  it('reads a record saved before booking offers as Duncit’s defaults, with no business named', () => {
    render(<VenueOffersCard own={null} effective={{ min_guests: 8, response_hours: 24 }} />);
    expect(screen.getByText('8 guests · Duncit’s default')).toBeInTheDocument();
    expect(screen.getByText('24 hours · Duncit’s default')).toBeInTheDocument();
    expect(screen.getByText('Business you expect per booking')).toBeInTheDocument();
    expect(screen.getByText('Not set yet')).toBeInTheDocument();
  });
});

// The business the venue hopes a booking brings — a guide hosts see, read back
// to staff in the pickers' order whatever order the venue saved it in.
describe('VenueOffersCard / business the venue expects', () => {
  const withBusiness = (min_business: { model: string; amount: number }[] | null) =>
    render(<VenueOffersCard own={{ ...EFFECTIVE, min_business }} effective={EFFECTIVE} />);

  it('lists each amount on its basis in the pickers’ order, paise shown only when there are any', () => {
    withBusiness([
      { model: 'FLAT', amount: 5000 },
      { model: 'PER_GUEST', amount: 249.5 },
      { model: 'PER_HOUR', amount: 400 },
    ]);
    expect(screen.getByText('₹249.50 per guest · ₹400 per hour · ₹5,000 per booking')).toBeInTheDocument();
    expect(screen.queryByText('Not set yet')).not.toBeInTheDocument();
  });

  it('leaves out an amount of 0 and a basis this client no longer offers', () => {
    withBusiness([
      { model: 'PER_SLOT', amount: 300 },
      { model: 'PER_HOUR', amount: 0 },
      { model: 'PER_GUEST', amount: 200 },
    ]);
    expect(screen.getByText('₹200 per guest')).toBeInTheDocument();
    expect(screen.queryByText(/300/)).not.toBeInTheDocument();
    expect(screen.queryByText(/per hour/)).not.toBeInTheDocument();
  });

  it.each([
    ['an empty list', []],
    ['an absent list', null],
    ['only amounts it cannot show', [{ model: 'PER_SLOT', amount: 300 }, { model: 'FLAT', amount: 0 }]],
  ])('says it is not set yet for %s', (_label, rows) => {
    withBusiness(rows);
    expect(screen.getByText('Not set yet')).toBeInTheDocument();
  });
});

describe('VenueOperationsTab booking offers', () => {
  it('shows the card only when the venue carries the values in effect', () => {
    const { unmount } = render(<VenueOperationsTab settings={venueSettings()} />);
    expect(screen.queryByTestId('venue-offers-card')).not.toBeInTheDocument();
    unmount();

    render(<VenueOperationsTab settings={venueSettings()} venue={{ offer_min_guests: 10, offer_response_hours: 24 }} />);
    expect(screen.getByTestId('venue-offers-card')).toBeInTheDocument();
  });
});
