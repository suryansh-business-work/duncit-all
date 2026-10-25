import { renderHook } from '@testing-library/react-native';

import { PodMessageType } from '@/generated/graphql/graphql';
import { useChatVenueOffer } from '@/hooks/useChatVenueOffer';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
import {
  counteredOffer,
  hostAnswersApi,
  offerMove,
  venueAnswersApi,
} from '@/utils/venue-offer-fixture';

const mockRefresh = jest.fn(() => Promise.resolve());
const mockHost = hostAnswersApi();
const mockVenue = venueAnswersApi();
const mockLive = counteredOffer();
jest.mock('@/hooks/usePodVenueOffer', () => ({
  usePodVenueOffer: () => ({ offer: mockLive, refresh: mockRefresh, host: mockHost }),
}));
const mockVenueAnswers = jest.fn((..._args: unknown[]) => mockVenue);
jest.mock('@/hooks/useVenueOfferAnswers', () => ({
  useVenueOfferAnswers: (...args: unknown[]) => mockVenueAnswers(...args),
}));

const line = (id: string, over: Partial<VenueChatMessage> = {}): VenueChatMessage => ({
  id,
  pod_id: 'pod-1',
  club_id: null,
  user_id: 'u1',
  user_name: 'Asha',
  user_photo: null,
  type: PodMessageType.Text,
  text: 'Hello',
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: '2026-08-29T10:00:00.000Z',
  reply_to_id: null,
  reply_to: null,
  mentions: [],
  mention_users: [],
  offer: null,
  ...over,
});

const offerLine = (id: string, event = 'OFFER') =>
  line(id, { type: PodMessageType.Offer, offer: offerMove({ event }) });

beforeEach(() => mockRefresh.mockClear());

describe('useChatVenueOffer', () => {
  it('draws only the offer lines this build knows, and names the newest', () => {
    const lines = [
      offerLine('a'),
      line('b'),
      line('c', { type: PodMessageType.Offer, offer: null }),
      offerLine('d', 'WITHDRAWN'),
      offerLine('e', 'COUNTER'),
    ];
    const { result } = renderHook(() => useChatVenueOffer('pod-1', lines, true));
    expect([...result.current.moves.keys()]).toEqual(['a', 'e']);
    expect(result.current.newestId).toBe('e');
    expect(result.current.live).toBe(mockLive);
    expect(result.current.host).toBe(mockHost);
    expect(result.current.venue).toBe(mockVenue);
    // The venue's answers re-read the same live offer.
    expect(mockVenueAnswers).toHaveBeenCalledWith(mockRefresh);
  });

  it('re-reads the live offer when a new offer line lands — not for the page it loaded with', () => {
    const first = [offerLine('a')];
    const initialProps: { lines: VenueChatMessage[]; ready: boolean } = { lines: [], ready: false };
    const { rerender } = renderHook(
      ({ lines, ready }: { lines: VenueChatMessage[]; ready: boolean }) =>
        useChatVenueOffer('pod-1', lines, ready),
      { initialProps },
    );
    rerender({ lines: first, ready: true });
    expect(mockRefresh).not.toHaveBeenCalled();

    // A text line moves nothing.
    rerender({ lines: [...first, line('b')], ready: true });
    expect(mockRefresh).not.toHaveBeenCalled();

    rerender({ lines: [...first, line('b'), offerLine('c', 'COUNTER')], ready: true });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('waits for the first page before it tracks anything', () => {
    const { rerender } = renderHook(
      ({ lines }: { lines: VenueChatMessage[] }) => useChatVenueOffer('pod-1', lines, false),
      { initialProps: { lines: [offerLine('a')] } },
    );
    rerender({ lines: [offerLine('a'), offerLine('b')] });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
