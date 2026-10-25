import { screen } from '@testing-library/react-native';

import { OfferSummary } from '@/components/venue-slot-requests/OfferSummary';
import { VenueOfferAction, VenueOfferModel, VenueOfferParty } from '@/generated/graphql/graphql';
import type { BookingOffer } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';
import { offerTerms } from '@/utils/venue-offer-fixture';

const offer = (over: Partial<BookingOffer> = {}): BookingOffer => ({
  ...offerTerms(),
  history: [],
  ...over,
});

describe('OfferSummary', () => {
  it('reads the guests from the venue minimum to the pod’s spots, pets and the space, then the terms', () => {
    renderWithProviders(<OfferSummary offer={offer({ pets: true })} podIsFree={false} />);
    expect(screen.getByText('8–20 guests · Pets are coming · Court 2')).toBeOnTheScreen();
    expect(screen.getByText('Host offered')).toBeOnTheScreen();
    expect(screen.getByText('You receive ₹2,400 – ₹6,000')).toBeOnTheScreen();
    expect(screen.queryByTestId('offer-summary-history')).toBeNull();
  });

  it('reads the whole venue when no space was picked, and quotes nothing for a free pod', () => {
    renderWithProviders(
      <OfferSummary offer={offer({ space_label: '', min_guests: 0 })} podIsFree />,
    );
    expect(screen.getByText('20 guests · Whole venue')).toBeOnTheScreen();
    expect(screen.queryByText(/You receive/)).toBeNull();
  });

  it('lists each step with its terms, the fewest guests named, its time and note — and skips one it cannot name', () => {
    renderWithProviders(
      <OfferSummary
        offer={offer({
          history: [
            {
              by: VenueOfferParty.Host,
              action: VenueOfferAction.Offer,
              model: VenueOfferModel.PerHour,
              rate: 1500,
              min_guests: null,
              note: '',
              at: '2026-08-25T09:00:00.000Z',
            },
            {
              by: VenueOfferParty.Venue,
              action: VenueOfferAction.Counter,
              model: VenueOfferModel.PerGuest,
              rate: 350,
              min_guests: 12,
              note: 'Weekend rate',
              at: null,
            },
            {
              by: VenueOfferParty.Host,
              action: VenueOfferAction.Reject,
              model: null,
              rate: null,
              min_guests: null,
              note: '',
              at: null,
            },
            {
              by: 'STAFF' as VenueOfferParty,
              action: VenueOfferAction.Offer,
              model: null,
              rate: null,
              min_guests: null,
              note: '',
              at: null,
            },
          ],
        })}
        podIsFree={false}
      />,
    );
    expect(screen.getByTestId('offer-summary-history')).toBeOnTheScreen();
    expect(screen.getByText(/^The host offered Per hour · ₹1,500 per hour · /)).toBeOnTheScreen();
    expect(
      screen.getByText('You countered with Per guest · ₹350 per guest · at least 12 guests'),
    ).toBeOnTheScreen();
    expect(screen.getByText('“Weekend rate”')).toBeOnTheScreen();
    expect(screen.getByText('The host declined your counter')).toBeOnTheScreen();
  });
});
