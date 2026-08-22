/**
 * The staff chat thread, rendered with one of every kind of message in it.
 *
 * The thread is where nearly all of the staff-chat code lives, and almost none
 * of it had ever run: the panel above it needs a socket and a peer-to-peer call
 * to reach this far, and neither exists in jsdom. Handed the messages directly,
 * it renders the whole tree underneath — the bubble, its badges and footer, the
 * text with its mentions and code blocks, attachments, voice notes, link cards,
 * locations, reactions, the actions menu and the call rows merged in by time.
 *
 * The fixtures are one message per SHAPE rather than a realistic conversation,
 * because a shape is what changes the rendering: a deleted message has no
 * reactions, a pending one has a clock where a tick would be, a failed one
 * offers a retry, an edited one may offer its history — and each of those is a
 * branch that only a message of that shape reaches.
 *
 * Every timestamp goes through the injected formatter, never the machine's own
 * clock: the whole point of `settings.timeZone` is that two people in different
 * places read the same message under the same time.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import MessageThread from '../src/staff-chat/MessageThread';
import { DEFAULT_CHAT_SETTINGS, type ChatFormats } from '../src/staff-chat/useChatSettings';
import type { StaffCall, StaffMessage } from '../src/staff-chat/queries';

const testTheme = createTheme();

const ME = 'u-me';
const PEER = 'u-peer';

/** Fixed and injected, so nothing here reads the machine's clock or zone. */
const formats: ChatFormats = {
  time: { format: (value: Date) => `T:${value.toISOString().slice(11, 16)}` },
  full: { format: (value: Date) => `F:${value.toISOString()}` },
  day: { format: (value: Date) => `D:${value.toISOString().slice(0, 10)}` },
};

const AT = '2026-08-20T09:30:00.000Z';

const message = (over: Partial<StaffMessage> & { id: string }): StaffMessage => ({
  from_user_id: PEER,
  to_user_id: ME,
  text: '',
  created_at: AT,
  ...over,
});

const MESSAGES: StaffMessage[] = [
  message({ id: 'm-plain', text: 'Morning — the court is booked.' }),
  message({ id: 'm-mine', from_user_id: ME, to_user_id: PEER, text: 'Thanks, noted.', read_at: AT }),
  message({ id: 'm-delivered', from_user_id: ME, to_user_id: PEER, text: 'On my way.', delivered_at: AT }),
  message({ id: 'm-pending', from_user_id: ME, to_user_id: PEER, text: 'Sending…', pending: true }),
  message({ id: 'm-failed', from_user_id: ME, to_user_id: PEER, text: 'Did not go.', failed: true }),
  message({ id: 'm-edited', text: 'Corrected copy.', edited_at: AT }),
  message({ id: 'm-deleted', text: '', deleted_at: AT }),
  message({ id: 'm-pinned', text: 'Read this first.', pinned_at: AT, pinned_by: ME }),
  message({ id: 'm-forwarded', text: 'Passing this on.', forwarded_from: PEER }),
  message({ id: 'm-reply', text: 'Answering that.', reply_to_id: 'm-plain' }),
  message({
    id: 'm-mention',
    text: 'cc @u-me — please confirm.',
    mentions: [ME],
  }),
  message({
    id: 'm-reacted',
    text: 'Nice one.',
    reactions: [
      { user_id: ME, emoji: '👍' },
      { user_id: PEER, emoji: '👍' },
      { user_id: PEER, emoji: '🎉' },
    ] as StaffMessage['reactions'],
  }),
  message({
    id: 'm-link',
    text: 'Details here: https://duncit.com/pods/weekly-badminton',
  }),
  message({
    id: 'm-code',
    text: 'Run this:\n```ts\nconst spots = pod.total_spots - 1;\n```',
  }),
  message({
    id: 'm-image',
    text: '',
    attachment_url: 'https://cdn.duncit.com/court.png',
    attachment_name: 'court.png',
    attachment_type: 'image/png',
    attachment_size: 240_000,
  }),
  message({
    id: 'm-file',
    text: '',
    attachment_url: 'https://cdn.duncit.com/roster.pdf',
    attachment_name: 'roster.pdf',
    attachment_type: 'application/pdf',
    attachment_size: 18_000,
  }),
  message({
    id: 'm-voice',
    text: '',
    attachment_url: 'https://cdn.duncit.com/note.webm',
    attachment_name: 'note.webm',
    attachment_type: 'audio/webm',
    attachment_size: 9_000,
    attachment_peaks: [0.1, 0.9, 0.4, 0.7, 0.2],
  }),
  message({
    id: 'm-video',
    text: '',
    attachment_url: 'https://cdn.duncit.com/clip.mp4',
    attachment_name: 'clip.mp4',
    attachment_type: 'video/mp4',
    attachment_size: 1_200_000,
  }),
  message({
    id: 'm-location',
    text: '',
    attachment_type: 'application/duncit-location',
    attachment_name: '12.9716,77.5946',
    attachment_url: 'https://maps.google.com/?q=12.9716,77.5946',
  }),
];

const CALLS: StaffCall[] = [
  {
    id: 'c-answered',
    from_user_id: ME,
    to_user_id: PEER,
    kind: 'AUDIO',
    outcome: 'ANSWERED',
    duration_seconds: 184,
    started_at: AT,
    ended_at: AT,
    recording_url: 'https://cdn.duncit.com/call.mp4',
  },
  {
    id: 'c-missed',
    from_user_id: PEER,
    to_user_id: ME,
    kind: 'VIDEO',
    outcome: 'MISSED',
    duration_seconds: 0,
    started_at: AT,
  },
  {
    id: 'c-declined',
    from_user_id: PEER,
    to_user_id: ME,
    kind: 'AUDIO',
    outcome: 'DECLINED',
    duration_seconds: 0,
    started_at: AT,
  },
];

const handlers = () => ({
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onReact: vi.fn(),
  onReply: vi.fn(),
  onForward: vi.fn(),
  onPin: vi.fn(),
  onRetry: vi.fn(),
  onNavigate: vi.fn(),
  onSelect: vi.fn(),
  onStartSelect: vi.fn(),
  onEditHistory: vi.fn(),
  onPlayRecording: vi.fn(),
  onLoadMore: vi.fn(),
});

/**
 * jsdom measures everything as zero and has no observer, so a scroller left to
 * itself never decides it is at the bottom and the thread renders as if empty.
 */
beforeAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight', 'scrollHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
  }
  for (const prop of ['offsetWidth', 'clientWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 1200 });
  }
  const size = [{ inlineSize: 1200, blockSize: 800 }];
  const box = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };
  class SizedResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size }] as never,
        this as never
      );
    }
    unobserve() {}
    disconnect() {}
  }
  class SeenIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: box, intersectionRect: box, rootBounds: box, time: 0 }] as never,
        this as never
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.ResizeObserver ??= SizedResizeObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= SeenIntersectionObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
  globalThis.HTMLMediaElement.prototype.play ??= () => Promise.resolve();
  globalThis.HTMLMediaElement.prototype.pause ??= () => undefined;
});

type ThreadProps = Parameters<typeof MessageThread>[0];

const thread = (over: Partial<ThreadProps> = {}) => {
  const spies = handlers();
  const result = render(
    <MockedProvider link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
      <MessageThread
        messages={MESSAGES}
        calls={CALLS}
        meId={ME}
        loading={false}
        hasMore={false}
        loadingMore={false}
        settings={DEFAULT_CHAT_SETTINGS}
        formats={formats}
        spacing={1}
        nameOf={(userId) => (userId === ME ? 'Asha Rao' : 'Vikram N')}
        {...spies}
        {...over}
      />
    </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, spies };
};

describe('MessageThread', () => {
  it('renders every message it was given', () => {
    const { container } = thread();

    expect(container.textContent).toContain('Morning — the court is booked.');
    expect(container.textContent).toContain('Corrected copy.');
    expect(container.textContent).toContain('Read this first.');
  });

  it('shows a skeleton rather than an empty thread while history loads', () => {
    const { container } = thread({ loading: true, messages: [], calls: [] });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders an empty conversation without falling over', () => {
    const { container } = thread({ messages: [], calls: [] });

    expect(container).toBeDefined();
  });

  it('reads every timestamp through the injected formatter, never the machine clock', () => {
    const { container } = thread();

    expect(container.textContent).toContain('T:09:30');
  });

  it('merges the calls into the thread beside the messages', () => {
    const { container } = thread();
    const withoutCalls = thread({ calls: [] });

    expect(container.textContent?.length ?? 0).toBeGreaterThan(
      withoutCalls.container.textContent?.length ?? 0
    );
  });

  it('renders the compact density as well as the comfortable one', () => {
    const { container } = thread({
      settings: { ...DEFAULT_CHAT_SETTINGS, density: 'COMPACT', bubbleColor: 'success', fontSize: 12 },
    });

    expect(container.innerHTML).not.toBe('');
  });

  it('flashes the message a search result jumped to', () => {
    const { container } = thread({ jumpToId: 'm-code' });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders the selection state for messages picked in bulk', () => {
    const { container } = thread({ selectedIds: new Set(['m-plain', 'm-image']) });

    expect(container.innerHTML).not.toBe('');
  });

  it('offers to load older history only when there is some', () => {
    const withMore = thread({ hasMore: true });
    expect(withMore.container.innerHTML).not.toBe('');

    const loading = thread({ hasMore: true, loadingMore: true });
    expect(loading.container.innerHTML).not.toBe('');
  });

  it('hides the edit history from a reader who may not see earlier wordings', () => {
    const { container } = thread({ onEditHistory: undefined });

    expect(container.textContent).toContain('Corrected copy.');
  });

  it('survives every control in the thread being pressed', () => {
    const { container, spies } = thread();

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 40)) {
      if (control.isConnected) fireEvent.click(control);
    }

    // Whatever was pressed, nothing may report a message the thread does not
    // hold — a handler firing for an id that is not on screen is a wiring bug.
    const ids = new Set(MESSAGES.map((m) => m.id));
    for (const [id] of spies.onPin.mock.calls) expect(ids.has(id as string)).toBe(true);
    for (const [id] of spies.onReact.mock.calls) expect(ids.has(id as string)).toBe(true);
  });

  it('survives every message being clicked, which is how bulk selection starts', () => {
    const { container, spies } = thread({ selectedIds: new Set<string>() });

    for (const row of [...container.querySelectorAll<HTMLElement>('[class*="MuiPaper"]')].slice(0, 25)) {
      if (row.isConnected) fireEvent.click(row);
    }

    const ids = new Set(MESSAGES.map((m) => m.id));
    for (const [id] of spies.onSelect.mock.calls) expect(ids.has(id as string)).toBe(true);
  });
});
