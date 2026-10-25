import { act, fireEvent, screen } from '@testing-library/react-native';

import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import { SlotPricingMode, VenueOfferStatus } from '@/generated/graphql/graphql';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, offerTerms, venueAnswersApi } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: () => ({ result: null, error: null, isLoading: false }),
}));

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

const withHistory = (offer = offerTerms()) => ({ ...offer, history: [] });

const mount = (row: SlotRequestRow) => {
  const answers = venueAnswersApi();
  renderWithProviders(<SlotRequestCard request={row} answers={answers} />);
  return answers;
};

describe('SlotRequestCard', () => {
  it('quotes a paid pod’s slot price on a request from before offers, with accept and reject only', async () => {
    const answers = mount(request());
    expect(screen.getByText('Slot price')).toBeOnTheScreen();
    expect(screen.getByText(/1,200/)).toBeOnTheScreen();
    expect(screen.queryByTestId('slot-request-free-pod-notice')).toBeNull();
    expect(screen.queryByTestId('slot-request-slot-1-counter')).toBeNull();
    fireEvent.press(screen.getByTestId('slot-request-slot-1-reject'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('offer-answer-confirm'));
    });
    // A request from before offers carries no round.
    expect(answers.reject).toHaveBeenCalledWith('slot-1', '', null);
  });

  it('tells the owner to settle a free pod with the host, and quotes no price', () => {
    mount(request({ pod_is_free: true, price: 0 }));
    const notice = screen.getByTestId('slot-request-free-pod-notice');
    expect(notice.props.role).toBe('status');
    expect(screen.getByText('This pod is free')).toBeOnTheScreen();
    expect(screen.queryByText('Slot price')).toBeNull();
    // The host's contact stays on the card, and the decision stays open.
    expect(screen.getByText('meera@duncit.com · 9000000001')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('slot-request-slot-1-accept'));
    expect(
      screen.getByText(/^“Sunday Badminton” goes live at Indiranagar Courts on .+\.$/),
    ).toBeOnTheScreen();
  });

  it("shows a host's offer — guests, terms as a range and the ask — with all three answers for its round", async () => {
    const answers = mount(request({ offer: withHistory() }));
    expect(screen.getByText('8–20 guests · Court 2')).toBeOnTheScreen();
    expect(screen.getByText('Host offered')).toBeOnTheScreen();
    expect(screen.getByText('You receive ₹2,400 – ₹6,000')).toBeOnTheScreen();
    expect(screen.getByText('A projector')).toBeOnTheScreen();
    // An offer names where it stands itself; the old slot price and chip are gone.
    expect(screen.queryByText('Slot price')).toBeNull();
    expect(screen.queryByText('Awaiting decision')).toBeNull();

    fireEvent.press(screen.getByTestId('slot-request-slot-1-accept'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('offer-answer-confirm'));
    });
    expect(answers.accept).toHaveBeenCalledWith('slot-1', 1);
    fireEvent.press(screen.getByTestId('slot-request-slot-1-counter'));
    expect(screen.getByTestId('venue-offer-counter')).toBeOnTheScreen();
  });

  it('lets the venue change or withdraw its counter while the host decides, but not accept it', () => {
    mount(request({ offer: withHistory(counteredOffer()) }));
    expect(screen.getByText('Your counter')).toBeOnTheScreen();
    expect(screen.getByText('You receive ₹3,500 – ₹7,000')).toBeOnTheScreen();
    expect(screen.getByTestId('slot-request-slot-1-counter')).toHaveTextContent(/Change counter/);
    expect(screen.queryByTestId('slot-request-slot-1-accept')).toBeNull();
  });

  it('offers no answer once the offer is settled', () => {
    mount(request({ offer: withHistory(offerTerms({ status: VenueOfferStatus.Accepted })) }));
    expect(screen.queryByTestId('slot-request-slot-1-reject')).toBeNull();
    expect(screen.queryByTestId('slot-request-slot-1-accept')).toBeNull();
  });
});
