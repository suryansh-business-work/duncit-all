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

  it('reads a record saved before booking offers as Duncit’s defaults', () => {
    render(<VenueOffersCard own={null} effective={{ min_guests: 8, response_hours: 24 }} />);
    expect(screen.getByText('8 guests · Duncit’s default')).toBeInTheDocument();
    expect(screen.getByText('24 hours · Duncit’s default')).toBeInTheDocument();
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
