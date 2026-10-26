import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VenueChatLine } from '@duncit/utils';
import VenueChatPage from '..';
import { VENUE_CHAT_RESUBMIT_POD, VENUE_CHAT_ROOM } from '../queries';
import {
  HOST_CARD,
  at,
  counter,
  line,
  linesMock,
  liveOffer,
  markReadMock,
  offerLine,
  offerMock,
  roomMock,
} from './fixtures';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ podId: 'pod-1' }),
  useNavigate: () => navigate,
}));

// The socket is its own hook (useVenueChatSocket.test); here only what it hands the page matters.
const socket = vi.hoisted(() => ({
  onLine: null as null | ((line: VenueChatLine) => void),
  onRemoved: null as null | ((id: string) => void),
}));
vi.mock('../useVenueChatSocket', () => ({
  useVenueChatSocket: (params: { onLine: (line: VenueChatLine) => void; onRemoved: (id: string) => void }) => {
    socket.onLine = params.onLine;
    socket.onRemoved = params.onRemoved;
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

afterEach(() => {
  navigate.mockReset();
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
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks, markReadMock()]}>
      <VenueChatPage />
    </MockedProvider>,
  );

const counterLines = [line('t1'), offerLine('m1', 1, { event: 'OFFER', by: 'HOST' }), offerLine('m2', 2, { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000, note: 'Weekend rate' })];
const countered = liveOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, counter });

describe('VenueChatPage', () => {
  it('shows who the thread is with, text lines as bubbles and each offer move as a card — answerable only on the newest', async () => {
    renderPage([roomMock('HOST'), linesMock(counterLines), offerMock(countered)]);
    expect(await screen.findByTestId('venue-chat-title')).toHaveTextContent('Skyline Banquets');
    // The phone and email moved off the header into the Contact sheet.
    expect(screen.queryByRole('link', { name: /^Phone/ })).not.toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();

    const older = screen.getByRole('article', { name: 'You sent an offer' });
    // An older move is a record: it can be reacted to, never answered.
    expect(within(older).getAllByRole('button')).toEqual([within(older).getByRole('button', { name: 'React' })]);
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

    act(() => socket.onLine?.(line('t2', { text: 'See you there', createdAt: at(3) }) as VenueChatLine));
    expect(await screen.findByText('See you there')).toBeInTheDocument();
    expect(seen).toHaveLength(1);

    act(() => socket.onLine?.(offerLine('m3', 4, { event: 'ACCEPTED', by: 'HOST', round: 2, model: 'FLAT', rate: 7000 }) as VenueChatLine));
    expect(await screen.findByRole('article', { name: 'You accepted — booking confirmed' })).toBeInTheDocument();
    await waitFor(() => expect(seen).toHaveLength(2));
  });

  it('lets a host send a new offer from a declined line, prefilled from it — with nothing pinned once the offer is gone', async () => {
    const declined = [offerLine('m1', 1, { event: 'OFFER', by: 'HOST' }), offerLine('m2', 2, { event: 'DECLINED', by: 'VENUE', reason: 'Fully booked' })];
    renderPage([roomMock('HOST'), linesMock(declined), offerMock(null), resubmitPodMock()]);
    const card = await screen.findByRole('article', { name: 'The venue declined the offer' });
    expect(within(card).getByText('Reason: Fully booked')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-offer-pin')).not.toBeInTheDocument();
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

describe('VenueChatPage — the pinned offer', () => {
  it("pins the host's turn under the header, with when to answer and each side's counters left", async () => {
    renderPage([roomMock('HOST'), linesMock(counterLines), offerMock(countered)]);
    const pin = await screen.findByRole('status', { name: 'Booking offer' });
    expect(within(pin).getByTestId('venue-offer-pin-status')).toHaveTextContent('Your move');
    expect(within(pin).getByText(/^Answer by /)).toBeInTheDocument();
    // 3 a side: the host has used none, the venue one.
    expect(within(pin).getByTestId('venue-offer-pin-counters')).toHaveTextContent('You: 3 of 3 counters left · Venue: 2 of 3 left');
  });

  it("reads the same offer from the venue's side once it waits on the venue", async () => {
    renderPage([roomMock('VENUE'), linesMock([offerLine('m1', 1, { event: 'OFFER', by: 'HOST' })]), offerMock(liveOffer())]);
    const pin = await screen.findByRole('status', { name: 'Booking offer' });
    expect(within(pin).getByTestId('venue-offer-pin-status')).toHaveTextContent('Your move');
    expect(within(pin).getByTestId('venue-offer-pin-counters')).toHaveTextContent('You: 2 of 3 counters left · Host: 3 of 3 left');
  });
});

describe('VenueChatPage — Contact', () => {
  it("opens both sides' details over the chat, and each card opens its page", async () => {
    renderPage([roomMock('HOST'), linesMock([line('t1')]), offerMock(null)]);
    fireEvent.click(await screen.findByTestId('venue-chat-contact-open'));

    const host = within(await screen.findByTestId('venue-chat-host-card'));
    expect(host.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(host.getByText('@asha')).toBeInTheDocument();
    expect(host.getByText('Pottery teacher')).toBeInTheDocument();
    expect(host.getByRole('link', { name: 'Phone +91 90000 11111' })).toHaveAttribute('href', 'tel:+919000011111');
    expect(host.getByRole('link', { name: 'Email asha@host.test' })).toHaveAttribute('href', 'mailto:asha@host.test');

    const venue = within(screen.getByTestId('venue-chat-venue-card'));
    expect(venue.getByText('Banquet hall · Up to 120 guests')).toBeInTheDocument();
    expect(venue.getByText('4 MG Road, Bengaluru')).toBeInTheDocument();
    expect(venue.getByText('Ask for Ravi')).toBeInTheDocument();
    expect(venue.getByRole('link', { name: 'Phone +91 98000 00000' })).toHaveAttribute('href', 'tel:+919800000000');

    fireEvent.click(host.getByRole('button', { name: 'View profile' }));
    expect(navigate).toHaveBeenLastCalledWith('/u/asha');
    fireEvent.click(venue.getByRole('button', { name: 'View venue' }));
    expect(navigate).toHaveBeenLastCalledWith('/venue/venue-1');
    // The chat stayed where it was underneath.
    expect(screen.getByText('Hello!')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('venue-chat-contact-close'));
    await waitFor(() => expect(screen.queryByTestId('venue-chat-host-card')).not.toBeInTheDocument());
  });

  it('opens a host with no handle by their id', async () => {
    renderPage([roomMock('VENUE', { host: { ...HOST_CARD, username: '' } }), linesMock([line('t1')]), offerMock(null)]);
    fireEvent.click(await screen.findByTestId('venue-chat-contact-open'));
    fireEvent.click(within(await screen.findByTestId('venue-chat-host-card')).getByRole('button', { name: 'View profile' }));
    expect(navigate).toHaveBeenCalledWith('/u/u-host');
  });

  it('lists only the venue when the pod has no host on record — and reads no read marks as nobody having seen anything', async () => {
    renderPage([roomMock('HOST', { host: null, read_marks: null }), linesMock([line('t1')]), offerMock(null)]);
    expect(await screen.findByText('Hello!')).toBeInTheDocument();
    expect(screen.queryByTestId('seen-faces')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('venue-chat-contact-open'));
    expect(await screen.findByTestId('venue-chat-venue-card')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-chat-host-card')).not.toBeInTheDocument();
  });

  it('offers no Contact on a thread the reader is not part of', async () => {
    renderPage([
      {
        request: { query: VENUE_CHAT_ROOM, variables: { pod_id: 'pod-1' } },
        result: { errors: [new GraphQLError('Not your thread', { extensions: { code: 'FORBIDDEN' } })] },
      },
      linesMock([]),
    ]);
    expect(await screen.findByTestId('venue-chat-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-chat-contact-open')).not.toBeInTheDocument();
  });
});

describe('VenueChatPage — lines that change after they are sent', () => {
  it('puts a changed line in place of the one shown, marked edited', async () => {
    renderPage([roomMock('HOST'), linesMock([line('t1'), line('t2', { text: 'Bring aprons', createdAt: at(1) })]), offerMock(null)]);
    await screen.findByText('Hello!');

    act(() => socket.onLine?.(line('t1', { text: 'Hello, Asha!', edited_at: at(5) }) as VenueChatLine));

    const bubble = within(await screen.findByTestId('chat-message-t1'));
    expect(bubble.getByText('Hello, Asha!')).toBeInTheDocument();
    expect(bubble.getByText(/· Edited$/)).toBeInTheDocument();
    expect(screen.queryByText('Hello!')).not.toBeInTheDocument();
    // Only the changed line says so.
    expect(within(screen.getByTestId('chat-message-t2')).queryByText(/Edited/)).not.toBeInTheDocument();
  });

  it('takes a line its author removed off the screen — one from the page or one the socket brought', async () => {
    renderPage([roomMock('HOST'), linesMock([line('t1'), line('t2', { text: 'Bring aprons', createdAt: at(1) })]), offerMock(null)]);
    await screen.findByText('Hello!');
    act(() => socket.onLine?.(line('t3', { text: 'Typo here', createdAt: at(2) }) as VenueChatLine));
    expect(await screen.findByText('Typo here')).toBeInTheDocument();

    act(() => socket.onRemoved?.('t1'));
    act(() => socket.onRemoved?.('t3'));

    await waitFor(() => expect(screen.queryByText('Hello!')).not.toBeInTheDocument());
    expect(screen.queryByText('Typo here')).not.toBeInTheDocument();
    expect(screen.getByText('Bring aprons')).toBeInTheDocument();
  });
});
