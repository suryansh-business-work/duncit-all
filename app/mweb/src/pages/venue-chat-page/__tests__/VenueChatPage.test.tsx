import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { POD_VENUE_OFFER_TERMS } from '@duncit/availability-calendar';
import { VENUE_CHAT_PAGE, type VenueChatLine } from '@duncit/utils';
import VenueChatPage from '..';
import { VENUE_CHAT_MESSAGES, VENUE_CHAT_RESUBMIT_POD, VENUE_CHAT_ROOM } from '../queries';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ podId: 'pod-1' }),
  useNavigate: () => vi.fn(),
}));

// The socket is its own hook; here only what it hands the page matters.
const socket = vi.hoisted(() => ({ onLine: null as null | ((line: VenueChatLine) => void) }));
vi.mock('../useVenueChatSocket', () => ({
  useVenueChatSocket: (params: { onLine: (line: VenueChatLine) => void }) => {
    socket.onLine = params.onLine;
  },
}));

vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => ({ me: { user_id: 'u-host' } }) }));
// The bridge's media picker and links are the host-manage page's; the dialog it configures is stubbed below.
vi.mock('../../host-manage-page/HostPodActionsBridge', () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock('../../../components/MediaPickerDialog', () => ({ default: () => null }));
vi.mock('@duncit/host-pod-actions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/host-pod-actions')>()),
  PodResubmitDialog: ({ pod, offerPrefill, onSaved }: { pod: { id: string } | null; offerPrefill?: { model: string; rate: number; note: string }; onSaved: () => void }) =>
    pod ? (
      <div role="dialog" data-testid="resubmit-dialog">
        {`${pod.id} ${offerPrefill?.model} ${offerPrefill?.rate} ${offerPrefill?.note}`}
        <button type="button" onClick={onSaved}>
          saved
        </button>
      </div>
    ) : null,
}));

const START = '2026-12-05T12:30:00.000Z';
const END = '2026-12-05T14:30:00.000Z';

const breakdown = (venue_payout: number, total: number, pax: number) => ({
  __typename: 'VenuePriceBreakdown',
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  date: '2026-12-05',
  base: venue_payout,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: venue_payout,
  gst_pct: 0,
  taxes: 0,
  venue_payout,
  platform_fee_pct: 10,
  platform_fee: total - venue_payout,
  total,
  deposit: 0,
});

/** The live offer as `podVenueOffer` answers it. */
const liveOffer = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBookingOffer',
  slot_id: 'slot-1',
  status: 'SENT',
  round: 1,
  awaiting: 'VENUE',
  model: 'PER_GUEST',
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['10 chairs'],
  note: '',
  pets: false,
  space_label: '',
  expires_at: '2026-12-02T06:30:00.000Z',
  quote: breakdown(6000, 6600, 20),
  quote_min: breakdown(2400, 2640, 8),
  counter: null,
  pod_id: 'pod-1',
  start_at: START,
  end_at: END,
  ...over,
});

const counter = {
  __typename: 'VenueOfferCounter',
  model: 'FLAT',
  rate: 7000,
  min_guests: 0,
  offerings: [],
  note: 'Weekend rate',
  at: null,
  quote: breakdown(7000, 7700, 20),
  quote_min: breakdown(7000, 7700, 20),
};

const move = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueChatOffer',
  slot_id: 'slot-1',
  round: 1,
  event: 'OFFER',
  by: 'HOST',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['10 chairs'],
  note: '',
  start_at: START,
  end_at: END,
  space_label: '',
  pets: false,
  venue_receives_min: 2400,
  venue_receives_max: 6000,
  total_min: 2640,
  total_max: 6600,
  expires_at: '2026-12-02T06:30:00.000Z',
  reason: '',
  ...over,
});

const line = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  pod_id: 'pod-1',
  user_id: 'u-venue',
  user_name: 'Ravi',
  user_photo: null,
  type: 'TEXT',
  text: 'Hello!',
  image_url: null,
  deleted: false,
  createdAt: '2026-12-01T06:00:00.000Z',
  offer: null,
  ...over,
});

const offerLine = (id: string, minute: number, over: Record<string, unknown>) =>
  line(id, {
    type: 'OFFER',
    text: 'Booking offer',
    user_id: over.by === 'HOST' ? 'u-host' : 'u-venue',
    createdAt: `2026-12-01T06:${String(minute).padStart(2, '0')}:00.000Z`,
    offer: move(over),
  });

const roomMock = (my_side: 'HOST' | 'VENUE'): MockedResponse => ({
  request: { query: VENUE_CHAT_ROOM, variables: { pod_id: 'pod-1' } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      venueChatRoom: {
        __typename: 'VenueChatRoom',
        pod_id: 'pod-1',
        pod_title: 'Pottery night',
        pod_date_time: START,
        venue_id: 'venue-1',
        venue_name: 'Skyline Banquets',
        venue_photo: null,
        my_side,
        counterpart_name: my_side === 'HOST' ? 'Ravi' : 'Asha',
        counterpart_phone: '+91 98000 00000',
        counterpart_email: 'ravi@venue.test',
      },
    },
  },
});

const linesMock = (lines: object[]): MockedResponse => ({
  request: { query: VENUE_CHAT_MESSAGES, variables: { pod_id: 'pod-1', limit: VENUE_CHAT_PAGE } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { venueChatMessages: lines } },
});

const offerMock = (offer: object | null, seen: unknown[] = []): MockedResponse => ({
  request: { query: POD_VENUE_OFFER_TERMS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: unknown) => {
    seen.push(variables);
    return { data: { podVenueOffer: offer } };
  },
});

const resubmitPodMock = (fail = false): MockedResponse => ({
  request: { query: VENUE_CHAT_RESUBMIT_POD, variables: { pod_doc_id: 'pod-1' } },
  result: fail
    ? { errors: [new GraphQLError('This pod is no longer available')] }
    : {
        data: {
          pod: {
            __typename: 'Pod',
            id: 'pod-1',
            pod_title: 'Pottery night',
            pod_description: 'Throw your first bowl.',
            pod_images_and_videos: [{ __typename: 'PodMedia', url: 'https://img.test/cover.jpg', type: 'IMAGE' }],
            venue_id: 'venue-1',
            venue_approval_status: 'REJECTED',
            no_of_spots: 20,
          },
        },
      },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <VenueChatPage />
    </MockedProvider>,
  );

const counterLines = [line('t1'), offerLine('m1', 1, { event: 'OFFER', by: 'HOST' }), offerLine('m2', 2, { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000, note: 'Weekend rate' })];
const countered = liveOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, counter });

describe('VenueChatPage', () => {
  it("shows the venue's contact, text lines as bubbles and each offer move as a card — answerable only on the newest", async () => {
    renderPage([roomMock('HOST'), linesMock(counterLines), offerMock(countered)]);
    expect(await screen.findByTestId('venue-chat-title')).toHaveTextContent('Skyline Banquets');
    expect(screen.getByRole('link', { name: 'Phone +91 98000 00000' })).toHaveAttribute('href', 'tel:+919800000000');
    expect(screen.getByRole('link', { name: 'Email ravi@venue.test' })).toHaveAttribute('href', 'mailto:ravi@venue.test');
    expect(screen.getByText('Hello!')).toBeInTheDocument();

    const older = screen.getByRole('article', { name: 'You sent an offer' });
    expect(within(older).queryByRole('button')).not.toBeInTheDocument();
    const newest = screen.getByRole('article', { name: 'The venue countered' });
    expect(await within(newest).findByTestId('host-offer-accept')).toBeInTheDocument();
    expect(within(newest).getByTestId('host-offer-counter')).toBeInTheDocument();
    expect(within(newest).getByTestId('host-offer-reject')).toBeInTheDocument();
  });

  it('re-reads the live offer when a move arrives over the socket, and not for a text line', async () => {
    const seen: unknown[] = [];
    renderPage([roomMock('HOST'), linesMock(counterLines), offerMock(countered, seen)]);
    await screen.findByRole('article', { name: 'The venue countered' });
    await waitFor(() => expect(seen).toHaveLength(1));

    act(() => socket.onLine?.(line('t2', { text: 'See you there', createdAt: '2026-12-01T06:03:00.000Z' }) as VenueChatLine));
    expect(await screen.findByText('See you there')).toBeInTheDocument();
    expect(seen).toHaveLength(1);

    act(() => socket.onLine?.(offerLine('m3', 4, { event: 'ACCEPTED', by: 'HOST', round: 2, model: 'FLAT', rate: 7000 }) as VenueChatLine));
    expect(await screen.findByRole('article', { name: 'You accepted — booking confirmed' })).toBeInTheDocument();
    await waitFor(() => expect(seen).toHaveLength(2));
  });

  it('lets a host send a new offer from a declined line, prefilled from it', async () => {
    const declined = [offerLine('m1', 1, { event: 'OFFER', by: 'HOST' }), offerLine('m2', 2, { event: 'DECLINED', by: 'VENUE', reason: 'Fully booked' })];
    renderPage([roomMock('HOST'), linesMock(declined), offerMock(null), resubmitPodMock()]);
    const card = await screen.findByRole('article', { name: 'The venue declined the offer' });
    expect(within(card).getByText('Reason: Fully booked')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Send a new offer' }));
    expect(await screen.findByTestId('resubmit-dialog')).toHaveTextContent('pod-1 PER_GUEST 300');
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));
    await waitFor(() => expect(screen.queryByTestId('resubmit-dialog')).not.toBeInTheDocument());
  });

  it('says so when the pod cannot be read for a new offer', async () => {
    const declined = [offerLine('m1', 1, { event: 'DECLINED', by: 'VENUE' })];
    renderPage([roomMock('HOST'), linesMock(declined), offerMock(null), resubmitPodMock(true)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Send a new offer' }));
    expect(await screen.findByTestId('venue-chat-error')).toHaveTextContent('This pod is no longer available');
    expect(screen.queryByTestId('resubmit-dialog')).not.toBeInTheDocument();
  });

  it("gives the venue Accept, Counter and Reject on the host's open offer, and no new-offer button", async () => {
    renderPage([roomMock('VENUE'), linesMock([offerLine('m1', 1, { event: 'OFFER', by: 'HOST' })]), offerMock(liveOffer())]);
    expect(await screen.findByTestId('venue-chat-title')).toHaveTextContent('Pottery night');
    const card = screen.getByRole('article', { name: 'New booking offer' });
    expect(within(card).getByText(/^You receive/)).toHaveTextContent('₹2,400 – ₹6,000');
    expect(await within(card).findByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(within(card).getByTestId('offer-counter-slot-1')).toBeInTheDocument();
    expect(within(card).getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send a new offer' })).not.toBeInTheDocument();
  });
});
