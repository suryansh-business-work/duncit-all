import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatRoomPage from '../ChatRoomPage';
import { opLink, type OpHandler } from '../../../__tests__/op-link';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ id: 'room1' }),
  useNavigate: () => vi.fn(),
}));

let socketParams: { onMessage: (m: unknown) => void; refetch: () => void } | null = null;
vi.mock('../usePodSocket', () => ({
  usePodSocket: (params: typeof socketParams) => {
    socketParams = params;
  },
}));
vi.mock('../../../components/MediaPickerDialog', () => ({ default: () => null }));

/** Line `n` of the room: a higher n is newer. */
const line = (n: number, text = `line ${n}`) => ({
  __typename: 'PodMessage',
  id: `m${n}`,
  pod_id: 'room1',
  club_id: 'room1',
  user_id: 'other',
  user_name: 'Bob',
  user_photo: null,
  type: 'TEXT',
  text,
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => line(from + i));

const podRoom = (podMessages: unknown[]) => ({
  me: { __typename: 'User', user_id: 'me1' },
  podMessages,
  podChatInfo: { __typename: 'PodChatInfo', chat_deletes_at: null, closed: false, can_moderate: false },
  pod: {
    __typename: 'Pod',
    id: 'room1',
    pod_title: 'Weekend Ride',
    pod_date_time: new Date(Date.now() + 3_600_000).toISOString(),
    pod_end_date_time: null,
    pod_id: 'P1',
    club_slug: 'riders',
  },
});
const clubRoom = (clubMessages: unknown[]) => ({
  me: { __typename: 'User', user_id: 'me1' },
  clubMessages,
  clubChatRoom: {
    __typename: 'ClubChatRoom',
    id: 'room1',
    club_slug: 'riders',
    club_name: 'Riders',
    retention_days: null,
    can_moderate: false,
  },
});

/** Pages keyed by `before` (none = the newest page). */
function pages(byBefore: Record<string, unknown[]>, wrap: (lines: unknown[]) => Record<string, unknown>): OpHandler {
  return (variables) => {
    const lines = byBefore[String(variables.before ?? 'newest')];
    if (!lines) throw new Error(`no page before ${String(variables.before)}`);
    return wrap(lines);
  };
}

function renderRoom(handlers: Record<string, OpHandler>, kind: 'POD' | 'CLUB' = 'POD') {
  const ops = opLink({
    ChatParticipants: () => ({
      chatParticipants: { __typename: 'ChatParticipants', participant_count: 0, hosts: [], participants: [] },
    }),
    ...handlers,
  });
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      <ChatRoomPage kind={kind} />
    </MockedProvider>,
  );
  return ops;
}

const BUBBLES =
  '[data-testid^="chat-message-"]:not([data-testid^="chat-message-more-"]):not([data-testid^="chat-message-image-"])';
const bubbleIds = () =>
  Array.from(document.querySelectorAll(BUBBLES)).map((el) => el.getAttribute('data-testid')?.replace('chat-message-', ''));

/** jsdom lays nothing out: the log is 40px per line, scrolled to `top`. */
function layOut(top: number) {
  const log = screen.getByTestId('chat-room-messages');
  let scrollTop = top;
  Object.defineProperty(log, 'scrollTop', { configurable: true, get: () => scrollTop, set: (v: number) => (scrollTop = v) });
  Object.defineProperty(log, 'scrollHeight', { configurable: true, get: () => 40 * log.querySelectorAll(BUBBLES).length });
  Object.defineProperty(log, 'clientHeight', { configurable: true, get: () => 400 });
  return log;
}

/** The reader drags the log from `from` up to `to`: two scroll events, the second one upwards. */
function scrollUp(log: HTMLElement, to: number, from = 800) {
  log.scrollTop = from;
  fireEvent.scroll(log);
  log.scrollTop = to;
  fireEvent.scroll(log);
}

const podLines = (podMessages: unknown[]) => ({ podMessages });
const clubLines = (clubMessages: unknown[]) => ({ clubMessages });

beforeAll(() => {
  (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = vi.fn();
});
beforeEach(() => {
  socketParams = null;
});

const NEWEST = range(31, 60);
const OLDER = [...range(2, 30), line(31)]; // a full page, one line shared with the newest
const OLDEST = [line(1)];

describe('ChatRoomPage scroll-up history', () => {
  it('opens on the newest page of 30, asked for without a cursor, and asks for nothing older on open', async () => {
    const ops = renderRoom({ PodMessages: pages({ newest: NEWEST }, podRoom), PodMessagePage: pages({}, podLines) });
    expect(await screen.findByText('line 60')).toBeInTheDocument();
    expect(ops.callsTo('PodMessages')[0].variables).toEqual({ pod_id: 'room1', limit: 30 });
    // The log sits at 0 before its first scroll to the newest line: that is not reading up.
    fireEvent.scroll(layOut(0));
    expect(ops.callsTo('PodMessagePage')).toHaveLength(0);
    // Older lines may exist, so the room's opening notice waits for its first line.
    expect(screen.queryByTestId('chat-room-notice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show earlier messages' })).toBeInTheDocument();
  });

  it('loads the page before the oldest line on reading up to the top, keeps the reader’s line in place, and stops at the start', async () => {
    const ops = renderRoom({
      PodMessages: pages({ newest: NEWEST }, podRoom),
      PodMessagePage: pages({ [line(31).createdAt]: OLDER, [line(2).createdAt]: OLDEST }, podLines),
    });
    await screen.findByText('line 60');
    const log = layOut(800);

    // Reading up twice while the first page is in flight asks once.
    scrollUp(log, 40, 80);
    scrollUp(log, 40, 80);
    expect(log).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('line 2')).toBeInTheDocument();
    const older = ops.callsTo('PodMessagePage');
    expect(older).toHaveLength(1);
    expect(older[0].variables).toEqual({ pod_id: 'room1', limit: 30, before: line(31).createdAt });
    // The lean page query: the room itself is not asked for again.
    expect(ops.callsTo('PodMessages')).toHaveLength(1);

    // Oldest first, the shared line once.
    expect(bubbleIds()).toEqual(range(2, 60).map((m) => m.id));
    // 29 new lines went in above: the reader's line moved down by their height.
    await waitFor(() => expect(log.scrollTop).toBe(40 + 29 * 40));
    expect(log).toHaveAttribute('aria-busy', 'false');

    // A short page is the room's start: no control, no further request.
    scrollUp(log, 0);
    expect(await screen.findByText('line 1')).toBeInTheDocument();
    expect(ops.callsTo('PodMessagePage').at(-1)?.variables.before).toBe(line(2).createdAt);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Show earlier messages' })).not.toBeInTheDocument());
    scrollUp(log, 0);
    expect(ops.callsTo('PodMessagePage')).toHaveLength(2);
    // The room's status notice opens it once its first line is in.
    expect(screen.getByTestId('chat-room-notice-live')).toBeInTheDocument();
  });

  it('never asks while the reader is below the top, or scrolling down through it', async () => {
    const ops = renderRoom({ PodMessages: pages({ newest: NEWEST }, podRoom), PodMessagePage: pages({}, podLines) });
    await screen.findByText('line 60');
    scrollUp(layOut(800), 400);
    const log = screen.getByTestId('chat-room-messages');
    log.scrollTop = 0;
    fireEvent.scroll(log);
    log.scrollTop = 60;
    fireEvent.scroll(log);
    // Only the 400 -> 0 move went up into the band.
    expect(ops.callsTo('PodMessagePage')).toHaveLength(1);
  });

  it('keeps live lines at the end and the older pages through a socket refresh', async () => {
    let reads = 0;
    const ops = renderRoom({
      PodMessages: () => {
        reads += 1;
        // The second read of the newest page carries an edit to its last line.
        return podRoom([...range(32, 60), line(61, reads > 1 ? 'edited 61' : 'line 61')]);
      },
      PodMessagePage: pages({ [line(32).createdAt]: OLDER }, podLines),
    });
    await screen.findByText('line 61');
    fireEvent.click(screen.getByRole('button', { name: 'Show earlier messages' }));
    expect(await screen.findByText('line 2')).toBeInTheDocument();

    act(() => socketParams?.onMessage(line(70, 'live line')));
    expect(await screen.findByText('live line')).toBeInTheDocument();
    expect(bubbleIds().at(-1)).toBe('m70');

    // A reaction elsewhere re-reads the newest page; the older pages stay.
    act(() => socketParams?.refetch());
    expect(await screen.findByText('edited 61')).toBeInTheDocument();
    expect(ops.callsTo('PodMessages')[1].variables).toEqual({ pod_id: 'room1', limit: 30 });
    expect(bubbleIds()).toHaveLength(61);
    expect(bubbleIds()[0]).toBe('m2');
    expect(bubbleIds().at(-1)).toBe('m70');
  });

  it('says so when an older page fails, waits for Show earlier, and tries again from it', async () => {
    let fail = true;
    const ops = renderRoom({
      PodMessages: pages({ newest: NEWEST }, podRoom),
      PodMessagePage: () => {
        if (fail) throw new Error('offline');
        return podLines(OLDEST);
      },
    });
    await screen.findByText('line 60');
    const log = layOut(800);
    scrollUp(log, 0);
    expect(await screen.findByRole('alert')).toHaveTextContent('The chat could not load.');
    expect(screen.getByText('line 31')).toBeInTheDocument();
    // No retry on scroll after a failure.
    scrollUp(log, 0);
    expect(ops.callsTo('PodMessagePage')).toHaveLength(1);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Show earlier messages' }));
    expect(await screen.findByText('line 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pages a club room the same way', async () => {
    const ops = renderRoom(
      {
        ClubMessages: pages({ newest: NEWEST }, clubRoom),
        ClubMessagePage: pages({ [line(31).createdAt]: OLDEST }, clubLines),
      },
      'CLUB',
    );
    await screen.findByText('line 60');
    expect(ops.callsTo('ClubMessages')[0].variables).toEqual({ club_id: 'room1', limit: 30 });
    scrollUp(layOut(800), 0);
    expect(await screen.findByText('line 1')).toBeInTheDocument();
    expect(ops.callsTo('ClubMessagePage')[0].variables).toEqual({ club_id: 'room1', limit: 30, before: line(31).createdAt });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Show earlier messages' })).not.toBeInTheDocument());
  });

  it('a room shorter than one page has nothing older to ask for', async () => {
    const ops = renderRoom({ PodMessages: pages({ newest: range(1, 5) }, podRoom), PodMessagePage: pages({}, podLines) });
    await screen.findByText('line 5');
    scrollUp(layOut(800), 0);
    expect(screen.queryByRole('button', { name: 'Show earlier messages' })).not.toBeInTheDocument();
    expect(ops.callsTo('PodMessagePage')).toHaveLength(0);
  });
});
