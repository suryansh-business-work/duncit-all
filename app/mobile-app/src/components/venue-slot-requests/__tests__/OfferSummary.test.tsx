import { screen } from '@testing-library/react-native';

import { OfferSummary, offerTermsText } from '@/components/venue-slot-requests/OfferSummary';
import {
  VenueOfferAction,
  VenueOfferModel,
  VenueOfferParty,
  VenueOfferStatus,
} from '@/generated/graphql/graphql';
import type { BookingOffer } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';

const quote = {
  base: 6000,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  taxes: 0,
  venue_payout: 6000,
  platform_fee: 600,
  total: 6600,
  deposit: 0,
};

const offer = (over: Partial<BookingOffer> = {}): BookingOffer => ({
  slot_id: 'slot-1',
  status: VenueOfferStatus.Sent,
  awaiting: VenueOfferParty.Venue,
  model: VenueOfferModel.PerHour,
  rate: 1500,
  pax: 12,
  pets: false,
  space_label: '',
  quote,
  counter: null,
  history: [],
  ...over,
});

describe('offerTermsText', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}${JSON.stringify(options.vars)}` : key;

  it('names the option and its amount', () => {
    expect(offerTermsText(t, 'PER_HOUR', 1500)).toContain('availability.offers.termsLine');
  });

  it('is just the amount for an option this build does not know', () => {
    expect(offerTermsText(t, 'PER_DAY', 1500)).toMatch(/1,500/);
  });
});

describe('OfferSummary', () => {
  it('reads the whole venue when no space was picked, and quotes nothing for a free pod', () => {
    renderWithProviders(<OfferSummary offer={offer()} podIsFree />);
    expect(screen.getByText('12 guests · Whole venue')).toBeOnTheScreen();
    expect(screen.queryByText(/You receive/)).toBeNull();
    expect(screen.queryByTestId('offer-summary-history')).toBeNull();
  });

  it('shows no status for one this build does not know', () => {
    renderWithProviders(
      <OfferSummary offer={offer({ status: 'EXPIRED' as VenueOfferStatus })} podIsFree={false} />,
    );
    expect(screen.queryByTestId('offer-summary-status')).toBeNull();
    expect(screen.getByTestId('offer-summary-slot-1-quote')).toBeOnTheScreen();
  });

  it('lists each negotiation step with its time and note, and skips one it cannot name', () => {
    renderWithProviders(
      <OfferSummary
        offer={offer({
          history: [
            {
              by: VenueOfferParty.Host,
              action: VenueOfferAction.Offer,
              model: VenueOfferModel.PerHour,
              rate: 1500,
              note: '',
              at: '2026-08-25T09:00:00.000Z',
            },
            {
              by: VenueOfferParty.Venue,
              action: VenueOfferAction.Counter,
              model: VenueOfferModel.Flat,
              rate: 7000,
              note: 'Weekend rate',
              at: null,
            },
            {
              by: VenueOfferParty.Host,
              action: VenueOfferAction.Reject,
              model: null,
              rate: null,
              note: '',
              at: null,
            },
            {
              by: 'STAFF' as VenueOfferParty,
              action: VenueOfferAction.Offer,
              model: null,
              rate: null,
              note: '',
              at: null,
            },
          ],
        })}
        podIsFree={false}
      />,
    );
    expect(screen.getByText(/The host offered/)).toBeOnTheScreen();
    expect(screen.getByText(/You countered with/)).toBeOnTheScreen();
    expect(screen.getByText('“Weekend rate”')).toBeOnTheScreen();
    expect(screen.getByText('The host declined your counter')).toBeOnTheScreen();
  });
});
