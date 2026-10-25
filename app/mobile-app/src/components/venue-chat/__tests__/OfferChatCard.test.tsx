import { fireEvent, screen } from '@testing-library/react-native';
import type { VenueChatOfferMove } from '@duncit/utils';

import { OfferChatCard } from '@/components/venue-chat/OfferChatCard';
import type { OfferChatAnswering } from '@/components/venue-chat/OfferChatActions';
import type { OfferTerms } from '@/components/venue-offer/offer-format';
import { renderWithProviders } from '@/utils/test-utils';
import {
  counteredOffer,
  hostAnswersApi,
  offerMove,
  offerTerms,
  venueAnswersApi,
} from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: () => ({ result: null, error: null, isLoading: false }),
}));

const room = {
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  venue_name: 'Court House',
  pod_is_free: false,
};

const answeringAs = (
  side: 'HOST' | 'VENUE',
  live: OfferTerms | null,
  over: Partial<OfferChatAnswering> = {},
): OfferChatAnswering => ({
  side,
  live,
  room,
  venue: venueAnswersApi(),
  host: hostAnswersApi(),
  onSendNewOffer: jest.fn(),
  ...over,
});

const mount = (move: VenueChatOfferMove, answering: OfferChatAnswering, newest = true) =>
  renderWithProviders(<OfferChatCard move={move} newest={newest} answering={answering} />);

describe('OfferChatCard — the venue reading a host offer', () => {
  it('shows the move, what the venue receives, the ask and its answers while it waits on the venue', () => {
    mount(offerMove(), answeringAs('VENUE', offerTerms()));
    expect(screen.getByText('New booking offer')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-move-terms')).toHaveTextContent('Per guest · ₹300 per guest');
    expect(screen.getByText('8–20 guests')).toBeOnTheScreen();
    expect(screen.getByText('Whole venue')).toBeOnTheScreen();
    expect(screen.getByText('You receive ₹2,400 – ₹6,000')).toBeOnTheScreen();
    expect(screen.getByText('A projector')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-answer-by')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-offer-accept')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-offer-counter')).toBeOnTheScreen();
  });

  it('opens its accept for the live booking, naming the pod and the venue', () => {
    mount(offerMove(), answeringAs('VENUE', offerTerms()));
    fireEvent.press(screen.getByTestId('chat-offer-accept'));
    expect(screen.getByText(/^“Sunday Badminton” goes live at Court House on /)).toBeOnTheScreen();
  });

  it('is a record only on an older line, or once the venue has answered', () => {
    mount(offerMove(), answeringAs('VENUE', offerTerms()), false);
    expect(screen.queryByTestId('chat-offer-accept')).toBeNull();
    expect(screen.queryByTestId('offer-answer-by')).toBeNull();
  });

  it('shows pets and the space, and no money on a free pod', () => {
    mount(
      offerMove({ pets: true, space_label: 'Court 2', min_guests: 0 }),
      answeringAs('VENUE', null, { room: { ...room, pod_is_free: true } }),
    );
    expect(screen.getByText('20 guests · Pets are coming')).toBeOnTheScreen();
    expect(screen.getByText('Court 2')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-move-free')).toHaveTextContent(
      'Free pod: the host settles your charges with you directly, so no amount is quoted here.',
    );
    expect(screen.queryByTestId('offer-money')).toBeNull();
    // No live offer: nothing to answer.
    expect(screen.queryByTestId('chat-offer-accept')).toBeNull();
  });

  it('offers the venue no new offer after it declined', () => {
    mount(
      offerMove({ event: 'DECLINED', by: 'VENUE', reason: 'Booked out' }),
      answeringAs('VENUE', null),
    );
    expect(screen.getByText('You declined the offer')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-move-reason')).toHaveTextContent('Reason: Booked out');
    expect(screen.queryByTestId('offer-send-new')).toBeNull();
  });
});

describe('OfferChatCard — the host reading the venue', () => {
  it("answers the venue's counter with the host's own answers", () => {
    const move = offerMove({ event: 'COUNTER', by: 'VENUE', round: 2, rate: 350 });
    mount(move, answeringAs('HOST', counteredOffer()));
    expect(screen.getByText('The venue countered')).toBeOnTheScreen();
    expect(screen.getByText('Costs the pod ₹2,640 – ₹6,600, with Duncit’s fee')).toBeOnTheScreen();
    expect(screen.getByTestId('host-offer-accept')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-offer-accept')).toBeNull();
  });

  it('sends a new offer from a declined line, starting from its terms', () => {
    const onSendNewOffer = jest.fn();
    const move = offerMove({ event: 'DECLINED', by: 'VENUE', reason: '' });
    mount(move, answeringAs('HOST', null, { onSendNewOffer }));
    expect(screen.getByText('The venue declined the offer')).toBeOnTheScreen();
    expect(screen.queryByTestId('offer-move-reason')).toBeNull();
    fireEvent.press(screen.getByTestId('offer-send-new'));
    expect(onSendNewOffer).toHaveBeenCalledWith(move);
  });

  it("names a free pod in the host's words", () => {
    mount(
      offerMove({ by: 'HOST' }),
      answeringAs('HOST', offerTerms(), { room: { ...room, pod_is_free: true } }),
    );
    expect(screen.getByText('You sent an offer')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-move-free')).toHaveTextContent(
      "Free pod: you settle the venue's charges with it directly, so no amount is quoted here.",
    );
    // Their own offer waits on the venue: nothing for the host to press.
    expect(screen.queryByTestId('host-offer-accept')).toBeNull();
  });
});
