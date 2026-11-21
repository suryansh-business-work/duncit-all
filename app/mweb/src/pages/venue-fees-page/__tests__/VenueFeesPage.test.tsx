import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import VenueFeesPage from '../index';
import { MY_VENUES_OFFERS, type FeesVenue } from '../queries';

const h = vi.hoisted(() => ({
  result: { data: undefined as unknown, loading: false, error: undefined as unknown, refetch: vi.fn() },
  queried: [] as unknown[],
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown) => {
    h.queried.push(doc);
    return h.result;
  },
}));
// The two sections have suites of their own; here only what the page hands each one.
vi.mock('../BookingOffersCard', () => ({
  default: (p: { venue: FeesVenue }) => <div data-testid="offers-section" data-venue={p.venue.id} data-min-spend={p.venue.settings?.offers?.min_spend} />,
}));
vi.mock('@duncit/availability-calendar', () => ({
  VenuePricingPartEditor: (p: { venueId: string; part: string }) => <div data-testid="fees-section" data-venue={p.venueId} data-part={p.part} />,
}));
vi.mock('../../../components/StudioPageHeader', () => ({ default: (p: { title: string }) => <h1 data-testid="header">{p.title}</h1> }));

const venue = (id: string): FeesVenue => ({
  id,
  venue_name: `Venue ${id}`,
  status: 'APPROVED',
  city: 'Pune',
  offer_min_guests: 8,
  offer_response_hours: 24,
  settings: { offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'FLAT', amount: 900 }], min_spend: 4000 } },
});

const mount = () =>
  render(
    <MemoryRouter>
      <VenueFeesPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  globalThis.localStorage.clear();
  h.queried = [];
  h.result = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
});

describe('VenueFeesPage', () => {
  it('reads the owner’s venues with their offers, and shows the booking offers above the fees for the picked one', () => {
    h.result = { ...h.result, data: { myVenues: [venue('v1')] } };
    mount();
    expect(h.queried).toContain(MY_VENUES_OFFERS);
    expect(screen.getByTestId('header')).toHaveTextContent('Fees & Minimum Spend');
    const offers = screen.getByTestId('offers-section');
    const fees = screen.getByTestId('fees-section');
    expect(offers).toHaveAttribute('data-venue', 'v1');
    expect(offers).toHaveAttribute('data-min-spend', '4000');
    expect(fees).toHaveAttribute('data-venue', 'v1');
    expect(fees).toHaveAttribute('data-part', 'fees');
    // Offers first, then the fees.
    expect(offers.compareDocumentPosition(fees) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('asks an owner with no venue to register one, and draws neither section', () => {
    h.result = { ...h.result, data: { myVenues: [] } };
    mount();
    expect(screen.getByTestId('no-venues-alert')).toHaveTextContent('Register a venue first — settings apply to a venue you own.');
    expect(screen.queryByTestId('venue-fees-page')).not.toBeInTheDocument();
  });

  it('says the venues could not be read instead of claiming there are none', () => {
    h.result = { ...h.result, error: { message: 'Network down' } };
    mount();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.queryByTestId('offers-section')).not.toBeInTheDocument();
  });
});
