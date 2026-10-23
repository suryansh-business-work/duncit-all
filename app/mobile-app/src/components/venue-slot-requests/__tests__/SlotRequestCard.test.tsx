import { fireEvent, screen } from '@testing-library/react-native';

import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import {
  SlotPricingMode,
  VenueOfferAction,
  VenueOfferModel,
  VenueOfferParty,
  VenueOfferStatus,
} from '@/generated/graphql/graphql';
import type { BookingOffer, SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';

const quote = (venuePayout: number, total: number) => ({
  base: venuePayout,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  taxes: 0,
  venue_payout: venuePayout,
  platform_fee: total - venuePayout,
  total,
  deposit: 0,
});

const offer = (over: Partial<BookingOffer> = {}): BookingOffer => ({
  slot_id: 'slot-1',
  status: VenueOfferStatus.Sent,
  awaiting: VenueOfferParty.Venue,
  model: VenueOfferModel.PerGuest,
  rate: 300,
  pax: 20,
  pets: true,
  space_label: 'Court 2',
  quote: quote(6000, 6600),
  counter: null,
  history: [
    {
      by: VenueOfferParty.Host,
      action: VenueOfferAction.Offer,
      model: VenueOfferModel.PerGuest,
      rate: 300,
      note: '',
      at: null,
    },
  ],
  ...over,
});

const request = (over: Partial<SlotRequestRow> = {}): SlotRequestRow => ({
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  venue_name: 'Indiranagar Courts',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  pricing_mode: SlotPricingMode.Flat,
  overtime_rate: 0,
  whole_day: false,
  price: 1200,
  requested_at: '2026-08-25T09:00:00.000Z',
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2.',
  host_name: 'Meera N',
  host_email: 'meera@duncit.com',
  host_phone: '9000000001',
  pod_is_free: false,
  offer: null,
  ...over,
});

const mount = (row: SlotRequestRow) => {
  const spies = { onApprove: jest.fn(), onDecline: jest.fn(), onCounter: jest.fn() };
  renderWithProviders(<SlotRequestCard request={row} busy={false} {...spies} />);
  return spies;
};

describe('SlotRequestCard', () => {
  it('quotes a paid pod’s slot price on a request from before offers, with accept and reject only', () => {
    const spies = mount(request());
    expect(screen.getByText('Slot price')).toBeOnTheScreen();
    expect(screen.getByText(/1,200/)).toBeOnTheScreen();
    expect(screen.queryByTestId('slot-request-free-pod-notice')).toBeNull();
    expect(screen.queryByTestId('slot-request-counter-slot-1')).toBeNull();
    fireEvent.press(screen.getByTestId('slot-request-reject-slot-1'));
    expect(spies.onDecline).toHaveBeenCalledWith('slot-1');
  });

  it('tells the owner to settle a free pod with the host, and quotes no price', () => {
    const spies = mount(request({ pod_is_free: true, price: 0 }));
    const notice = screen.getByTestId('slot-request-free-pod-notice');
    expect(notice.props.role).toBe('status');
    expect(screen.getByText('This pod is free')).toBeOnTheScreen();
    expect(screen.queryByText('Slot price')).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
    // The host's contact stays on the card, and the decision stays open.
    expect(screen.getByText('meera@duncit.com · 9000000001')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Accept'));
    expect(spies.onApprove).toHaveBeenCalledWith(expect.objectContaining({ slot_id: 'slot-1' }));
  });

  it("shows a host's offer — guests, space, terms and what the venue receives — with all three answers", () => {
    const spies = mount(request({ offer: offer() }));
    expect(screen.getByText('20 guests · Pets are coming · Court 2')).toBeOnTheScreen();
    expect(screen.getByText('Host offered')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-summary-status')).toHaveTextContent('Waiting for your answer');
    expect(screen.getByText(/You receive/)).toHaveTextContent(/6,000/);
    expect(screen.getByText(/The host pays/)).toHaveTextContent(/6,600/);
    // An offer names where it stands itself; the old slot price and chip are gone.
    expect(screen.queryByText('Slot price')).toBeNull();
    expect(screen.getByTestId('offer-summary-history')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('slot-request-counter-slot-1'));
    expect(spies.onCounter).toHaveBeenCalledWith(expect.objectContaining({ slot_id: 'slot-1' }));
    fireEvent.press(screen.getByTestId('slot-request-accept-slot-1'));
    expect(spies.onApprove).toHaveBeenCalled();
  });

  it('lets the venue change or withdraw its counter while the host decides, but not accept it', () => {
    mount(
      request({
        offer: offer({
          status: VenueOfferStatus.Countered,
          awaiting: VenueOfferParty.Host,
          counter: {
            model: VenueOfferModel.Flat,
            rate: 7000,
            note: 'Weekend',
            quote: quote(7000, 7700),
          },
        }),
      }),
    );
    expect(screen.getByText('Your counter')).toBeOnTheScreen();
    expect(screen.getByText(/You receive/)).toHaveTextContent(/7,000/);
    expect(screen.getByTestId('slot-request-counter-slot-1')).toHaveTextContent(/Change counter/);
    expect(screen.queryByTestId('slot-request-accept-slot-1')).toBeNull();
  });

  it('offers no answer once the offer is settled', () => {
    mount(request({ offer: offer({ status: VenueOfferStatus.Accepted, awaiting: null }) }));
    expect(screen.queryByTestId('slot-request-reject-slot-1')).toBeNull();
    expect(screen.queryByTestId('slot-request-accept-slot-1')).toBeNull();
  });
});
