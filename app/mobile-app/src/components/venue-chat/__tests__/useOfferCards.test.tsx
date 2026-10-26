import { Fragment } from 'react';
import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';
import type { VenueChatReadMark } from '@duncit/utils';

import { useOfferCards } from '@/components/venue-chat/useOfferCards';
import type { OfferTerms } from '@/components/venue-offer/offer-format';
import { PodMessageType, VenueChatSide } from '@/generated/graphql/graphql';
import { renderWithProviders } from '@/utils/test-utils';
import {
  counteredOffer,
  hostAnswersApi,
  offerMove,
  offerTerms,
  reviseAnswersApi,
  venueAnswersApi,
  venueChatLine,
  venueChatRoomFixture,
} from '@/utils/venue-offer-fixture';

const mockMoves = new Map([
  ['m2', offerMove({ event: 'DECLINED', by: 'VENUE' })],
  ['m3', offerMove({ event: 'COUNTER', by: 'HOST', round: 3, rate: 320 })],
]);
const mockState = {
  live: null as OfferTerms | null,
  newestId: 'm2',
};
const mockHost = hostAnswersApi({ notice: { tone: 'success', text: 'Host notice' } });
const mockVenue = venueAnswersApi({ notice: { tone: 'warning', text: 'Venue notice' } });
const mockRevise = reviseAnswersApi();
jest.mock('@/hooks/useChatVenueOffer', () => ({
  useChatVenueOffer: () => ({
    live: mockState.live,
    newestId: mockState.newestId,
    moves: mockMoves,
    host: mockHost,
    venue: mockVenue,
    revise: mockRevise,
  }),
}));
jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: () => ({ result: null, error: null, isLoading: false }),
}));

const room = (side: VenueChatSide) => venueChatRoomFixture({ my_side: side });
const offerLine = (id: string, createdAt = '2026-08-29T10:00:00.000Z') =>
  venueChatLine({ id, type: PodMessageType.Offer, text: 'Offer', createdAt });
const footer = <Text testID="line-footer">10:00</Text>;

/** Draws lines through the hook, with the move a new offer would start from. */
function Thread({
  side,
  ids,
  marks = [],
}: Readonly<{ side: VenueChatSide; ids: string[]; marks?: VenueChatReadMark[] }>) {
  const cards = useOfferCards('pod-1', room(side), [], true, marks);
  return (
    <>
      {ids.map((id) => (
        <Fragment key={id}>{cards.renderCard(offerLine(id), { footer })}</Fragment>
      ))}
      <Text testID="new-offer">{cards.newOffer?.event ?? 'none'}</Text>
      <Text testID="close-new-offer" onPress={cards.closeNewOffer}>
        close
      </Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.live = null;
  mockState.newestId = 'm2';
  mockRevise.notice = null;
});

describe('useOfferCards', () => {
  it("draws a known offer line as its card with the line's foot, and nothing for any other line", () => {
    renderWithProviders(<Thread side={VenueChatSide.Host} ids={['m1', 'm2']} />);
    expect(screen.getAllByText('The venue declined the offer')).toHaveLength(1);
    expect(screen.getAllByTestId('line-footer')).toHaveLength(1);
  });

  it('holds the move a host sends a new offer from until its sheet closes', () => {
    renderWithProviders(<Thread side={VenueChatSide.Host} ids={['m2']} />);
    expect(screen.getByTestId('new-offer')).toHaveTextContent('none');
    fireEvent.press(screen.getByTestId('offer-send-new'));
    expect(screen.getByTestId('new-offer')).toHaveTextContent('DECLINED');
    fireEvent.press(screen.getByTestId('close-new-offer'));
    expect(screen.getByTestId('new-offer')).toHaveTextContent('none');
  });

  it("lets the host revise their own newest counter until the venue's read mark reaches it", () => {
    mockState.newestId = 'm3';
    // The host's counter is the terms on the table, waiting on the venue (round 3).
    mockState.live = offerTerms({ round: 3 });
    const { unmount } = renderWithProviders(<Thread side={VenueChatSide.Host} ids={['m3']} />);
    expect(screen.getByTestId('offer-revise-edit')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-revise-withdraw')).toBeOnTheScreen();
    unmount();

    // The venue has read past the counter: it is on the record now.
    const seen: VenueChatReadMark = {
      user_id: 'owner-1',
      side: 'VENUE',
      name: 'Court House',
      photo: null,
      last_read_at: '2026-08-29T10:05:00.000Z',
    };
    renderWithProviders(<Thread side={VenueChatSide.Host} ids={['m3']} marks={[seen]} />);
    expect(screen.queryByTestId('offer-revise-edit')).toBeNull();
    expect(screen.queryByTestId('offer-revise-withdraw')).toBeNull();
  });

  it("reads the venue's notice on the venue's side, the host's on the host's, and clears both with a revision's", () => {
    const venue = renderHook(() => useOfferCards('pod-1', room(VenueChatSide.Venue), [], true, []));
    expect(venue.result.current.notice?.text).toBe('Venue notice');
    expect(venue.result.current.side).toBe('VENUE');
    venue.result.current.clearNotice();
    expect(mockVenue.clearNotice).toHaveBeenCalled();
    expect(mockRevise.clearNotice).toHaveBeenCalled();

    const host = renderHook(() => useOfferCards('pod-1', room(VenueChatSide.Host), [], true, []));
    expect(host.result.current.notice?.text).toBe('Host notice');

    // An edit or withdrawal of one's own counter speaks over the last answer.
    mockRevise.notice = { tone: 'success', text: 'Your counter was updated.' };
    const revised = renderHook(() =>
      useOfferCards('pod-1', room(VenueChatSide.Host), [], true, []),
    );
    expect(revised.result.current.notice?.text).toBe('Your counter was updated.');
  });

  it('hands the live offer on for the pinned bar, and draws nothing before the room is known', () => {
    mockState.live = counteredOffer();
    const { result } = renderHook(() => useOfferCards('pod-1', null, [], false, []));
    expect(result.current.live).toBe(mockState.live);
    expect(result.current.side).toBe('HOST');
    expect(result.current.renderCard(offerLine('m2'), { footer })).toBeNull();
  });
});
