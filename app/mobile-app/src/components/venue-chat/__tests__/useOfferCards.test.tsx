import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { useOfferCards } from '@/components/venue-chat/useOfferCards';
import { PodMessageType, VenueChatSide } from '@/generated/graphql/graphql';
import type { ChatMessage } from '@/hooks/useChat';
import type { VenueChatRoom } from '@/hooks/useVenueChat';
import { renderWithProviders } from '@/utils/test-utils';
import { hostAnswersApi, offerMove, venueAnswersApi } from '@/utils/venue-offer-fixture';

const mockMove = offerMove({ event: 'DECLINED', by: 'VENUE' });
const mockHost = hostAnswersApi({ notice: { tone: 'success', text: 'Host notice' } });
const mockVenue = venueAnswersApi({ notice: { tone: 'warning', text: 'Venue notice' } });
jest.mock('@/hooks/useChatVenueOffer', () => ({
  useChatVenueOffer: () => ({
    live: null,
    newestId: 'm2',
    moves: new Map([['m2', mockMove]]),
    host: mockHost,
    venue: mockVenue,
  }),
}));

const room = (side: VenueChatSide): VenueChatRoom => ({
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_date_time: null,
  venue_id: 'venue-1',
  venue_name: 'Court House',
  venue_photo: null,
  my_side: side,
  pod_is_free: false,
  counterpart_name: null,
  counterpart_phone: null,
  counterpart_email: null,
});

const line = (id: string): ChatMessage => ({
  id,
  pod_id: 'pod-1',
  club_id: null,
  user_id: 'u1',
  user_name: null,
  user_photo: null,
  type: PodMessageType.Offer,
  text: 'Offer declined',
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: '2026-08-29T10:00:00.000Z',
  reply_to_id: null,
  reply_to: null,
  mentions: [],
  mention_users: [],
});

/** Draws two lines through the hook, with the move a new offer would start from. */
function Thread({ side }: Readonly<{ side: VenueChatSide }>) {
  const cards = useOfferCards('pod-1', room(side), [], true);
  return (
    <>
      {cards.renderMessage(line('m1'))}
      {cards.renderMessage(line('m2'))}
      <Text testID="new-offer">{cards.newOffer?.event ?? 'none'}</Text>
      <Text testID="close-new-offer" onPress={cards.closeNewOffer}>
        close
      </Text>
    </>
  );
}

describe('useOfferCards', () => {
  it("draws a known offer line as its card from the reader's side, and nothing for any other line", () => {
    renderWithProviders(<Thread side={VenueChatSide.Host} />);
    expect(screen.getAllByText('The venue declined the offer')).toHaveLength(1);
  });

  it('holds the move a host sends a new offer from until its sheet closes', () => {
    renderWithProviders(<Thread side={VenueChatSide.Host} />);
    expect(screen.getByTestId('new-offer')).toHaveTextContent('none');
    fireEvent.press(screen.getByTestId('offer-send-new'));
    expect(screen.getByTestId('new-offer')).toHaveTextContent('DECLINED');
    fireEvent.press(screen.getByTestId('close-new-offer'));
    expect(screen.getByTestId('new-offer')).toHaveTextContent('none');
  });

  it("reads the venue's notice on the venue's side, the host's on the host's", () => {
    const venue = renderHook(() => useOfferCards('pod-1', room(VenueChatSide.Venue), [], true));
    expect(venue.result.current.notice?.text).toBe('Venue notice');
    expect(venue.result.current.clearNotice).toBe(mockVenue.clearNotice);
    const host = renderHook(() => useOfferCards('pod-1', room(VenueChatSide.Host), [], true));
    expect(host.result.current.notice?.text).toBe('Host notice');
  });

  it('draws nothing before the room is known', () => {
    const { result } = renderHook(() => useOfferCards('pod-1', null, [], false));
    expect(result.current.renderMessage(line('m2'))).toBeNull();
    expect(result.current.notice?.text).toBe('Host notice');
  });
});
