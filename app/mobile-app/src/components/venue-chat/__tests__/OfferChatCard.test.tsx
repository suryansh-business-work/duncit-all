import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'tamagui';
import type { VenueChatOfferMove } from '@duncit/utils';

import { OfferChatCard } from '@/components/venue-chat/OfferChatCard';
import type { OfferChatAnswering } from '@/components/venue-chat/OfferChatActions';
import type { OfferTerms } from '@/components/venue-offer/offer-format';
import { renderWithProviders } from '@/utils/test-utils';
import {
  counteredOffer,
  freeVenueOffer,
  hostAnswersApi,
  offerMove,
  offerTerms,
  reviseAnswersApi,
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
  revise: reviseAnswersApi(),
  onSendNewOffer: jest.fn(),
  ...over,
});

const mount = (
  move: VenueChatOfferMove,
  answering: OfferChatAnswering,
  newest = true,
  extra: { seen?: boolean; onLongPress?: () => void } = {},
) =>
  renderWithProviders(
    <OfferChatCard
      move={move}
      newest={newest}
      answering={answering}
      footer={<Text testID="offer-line-footer">Sent 29 Aug, 10:00</Text>}
      {...extra}
    />,
  );

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

  it("reads a free venue request with the host's reason, no money and no counter", () => {
    const move = offerMove({
      model: 'FREE',
      rate: 0,
      venue_receives_min: 0,
      venue_receives_max: 0,
      total_min: 0,
      total_max: 0,
    });
    mount(move, answeringAs('VENUE', freeVenueOffer()));
    expect(screen.getByTestId('offer-move-terms')).toHaveTextContent('Free venue');
    expect(screen.getByTestId('offer-move-free-reason')).toHaveTextContent(
      'Requested free — Promotional offer: Launch week',
    );
    expect(screen.queryByTestId('offer-money')).toBeNull();
    expect(screen.getByTestId('chat-offer-accept')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-offer-counter')).toBeNull();
  });

  it("never lends the live booking's free reason to an older booking's line", () => {
    const older = offerMove({ slot_id: 'slot-0', model: 'FREE', rate: 0 });
    mount(older, answeringAs('VENUE', freeVenueOffer()), false);
    expect(screen.getByTestId('offer-move-terms')).toHaveTextContent('Free venue');
    expect(screen.queryByTestId('offer-move-free-reason')).toBeNull();
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

describe('OfferChatCard — every line has its foot, its photos and its menu', () => {
  it("shows the line's foot, the photos attached to the move, and opens the line's menu on a long press", () => {
    const onLongPress = jest.fn();
    const photos = [
      'https://ik.imagekit.io/duncit/chat/a.jpg',
      'https://ik.imagekit.io/duncit/chat/b.jpg',
    ];
    const move = offerMove({ event: 'COUNTER', by: 'VENUE', round: 2, images: photos });
    mount(move, answeringAs('HOST', counteredOffer()), true, { onLongPress });
    expect(screen.getByTestId('offer-line-footer')).toHaveTextContent('Sent 29 Aug, 10:00');
    const thumbs = screen.getByTestId('offer-move-images-2');
    expect(within(thumbs).getByLabelText('Open photo 1')).toBeOnTheScreen();
    expect(within(thumbs).getByLabelText('Open photo 2')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('offer-line-slot-1-2-COUNTER'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows no photo strip on a move that carries none', () => {
    mount(offerMove(), answeringAs('VENUE', offerTerms()));
    expect(screen.queryByTestId('offer-move-images-1')).toBeNull();
  });
});

describe('OfferChatCard — revising the reader’s own unseen counter', () => {
  // The venue's own counter on round 2, waiting on the host.
  const ownCounter = offerMove({
    event: 'COUNTER',
    by: 'VENUE',
    round: 2,
    model: 'PER_GUEST',
    rate: 350,
    min_guests: 10,
    note: 'Weekend rate',
    images: ['https://ik.imagekit.io/duncit/chat/setup.jpg'],
  });

  it('offers Edit and Withdraw instead of answers while the host has not seen it', () => {
    mount(ownCounter, answeringAs('VENUE', counteredOffer()));
    expect(screen.getByTestId('offer-revise-hint')).toHaveTextContent(
      'Not seen yet — you can still edit or withdraw it.',
    );
    expect(screen.getByTestId('offer-revise-edit')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-revise-withdraw')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-offer-accept')).toBeNull();
  });

  it('keeps it on the record once the host has seen it, or when a newer line followed', () => {
    const seen = mount(ownCounter, answeringAs('VENUE', counteredOffer()), true, { seen: true });
    expect(screen.queryByTestId('offer-revise-edit')).toBeNull();
    seen.unmount();
    mount(ownCounter, answeringAs('VENUE', counteredOffer()), false);
    expect(screen.queryByTestId('offer-revise-edit')).toBeNull();
  });

  it('re-opens the counter sheet filled with the counter, its note and photo, and saves it for the round read', async () => {
    const revise = reviseAnswersApi();
    mount(ownCounter, answeringAs('VENUE', counteredOffer(), { revise }));
    fireEvent.press(screen.getByTestId('offer-revise-edit'));
    expect(screen.getByText('Edit your counter')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-counter-send')).toHaveTextContent('Save changes');
    expect(screen.getByDisplayValue('350')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('10')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Weekend rate')).toBeOnTheScreen();
    const attached = screen.getByTestId('venue-offer-counter-image');
    expect(within(attached).getByLabelText('Open photo 1')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
    });
    await waitFor(() => expect(revise.edit).toHaveBeenCalled());
    expect(revise.edit).toHaveBeenCalledWith(
      {
        model: 'PER_GUEST',
        rate: 350,
        min_guests: 10,
        offerings: ['A projector'],
        images: ['https://ik.imagekit.io/duncit/chat/setup.jpg'],
      },
      'Weekend rate',
      2,
    );
    // Saved: the sheet closes.
    await waitFor(() => expect(screen.queryByText('Edit your counter')).toBeNull());
  });

  it('withdraws it only once confirmed, for the round read, and keeps a refusal on screen', async () => {
    const revise = reviseAnswersApi(
      { error: 'The other side has already seen this counter' },
      false,
    );
    mount(ownCounter, answeringAs('VENUE', counteredOffer(), { revise }));
    fireEvent.press(screen.getByTestId('offer-revise-withdraw'));
    expect(screen.getByText('Withdraw your counter?')).toBeOnTheScreen();
    expect(revise.withdraw).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('offer-withdraw-confirm-btn'));
    });
    expect(revise.withdraw).toHaveBeenCalledWith(2);
    // Refused: the confirmation stays, with the reason.
    expect(screen.getByText('The other side has already seen this counter')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('offer-withdraw-cancel'));
    expect(revise.clearError).toHaveBeenCalled();
  });
});
