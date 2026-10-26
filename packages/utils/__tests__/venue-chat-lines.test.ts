/**
 * What happens to a venue thread's lines after they are sent — a removed line
 * leaving the thread, read marks moving forward, the faces drawn under the
 * last line each member read, what a line lets the reader do, and its
 * reaction chips.
 */
import { describe, expect, it } from 'vitest';

import type { VenueChatLine, VenueChatReadMark, VenueChatSide } from '../src/venue-chat';
import {
  CHAT_EMOJIS,
  reactionGroups,
  seenByOtherSide,
  seenFacesByLine,
  venueChatLineActions,
  withReadMark,
  withoutVenueChatLine,
} from '../src/venue-chat-lines';

const line = (id: string, createdAt: string, over: Partial<VenueChatLine> = {}): VenueChatLine => ({
  id,
  user_id: 'host-1',
  type: 'TEXT',
  text: id,
  deleted: false,
  createdAt,
  ...over,
});

const mark = (user_id: string, side: VenueChatSide, last_read_at: string): VenueChatReadMark => ({
  user_id,
  side,
  name: user_id,
  photo: null,
  last_read_at,
});

/** Oldest first, as every thread keeps them. */
const thread = [line('l1', '2026-10-21T10:00:00.000Z'), line('l2', '2026-10-21T10:01:00.000Z'), line('l3', '2026-10-21T10:02:00.000Z')];

const [thumbs, heart, , party, fire] = CHAT_EMOJIS;

describe('CHAT_EMOJIS', () => {
  it('offers eight quick emoji, none twice', () => {
    expect(CHAT_EMOJIS).toHaveLength(8);
    expect(new Set(CHAT_EMOJIS).size).toBe(CHAT_EMOJIS.length);
  });
});

describe('withoutVenueChatLine', () => {
  it('drops the removed line and keeps the rest in order, leaving the thread on screen untouched', () => {
    expect(withoutVenueChatLine(thread, 'l2').map((l) => l.id)).toEqual(['l1', 'l3']);
    expect(thread.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });

  it('keeps every line when the removed one is not on screen', () => {
    const after = withoutVenueChatLine(thread, 'older-page-line');
    expect(after).toEqual(thread);
    expect(after).not.toBe(thread);
  });
});

describe('withReadMark', () => {
  const venue = mark('venue-1', 'VENUE', '2026-10-21T10:01:00.000Z');
  const cohost = mark('host-2', 'HOST', '2026-10-21T10:00:00.000Z');

  it('adds the mark of a member who had not read before', () => {
    expect(withReadMark([cohost], venue)).toEqual([cohost, venue]);
    expect(withReadMark([], venue)).toEqual([venue]);
  });

  it("moves a member's mark forward, keeping one mark per member", () => {
    const later = { ...venue, last_read_at: '2026-10-21T10:02:00.000Z' };
    expect(withReadMark([venue, cohost], later)).toEqual([cohost, later]);
  });

  it('never moves a mark back, and keeps the one held for the same moment', () => {
    const marks = [venue, cohost];
    const earlier = withReadMark(marks, { ...venue, last_read_at: '2026-10-21T10:00:00.000Z' });
    expect(earlier).toEqual(marks);
    expect(earlier).not.toBe(marks);
    expect(withReadMark(marks, { ...venue, name: 'Late echo' })).toEqual(marks);
  });
});

describe('seenFacesByLine', () => {
  it("puts each other member's face under the last line written at or before their mark", () => {
    const venue = mark('venue-1', 'VENUE', '2026-10-21T10:01:30.000Z');
    const cohost = mark('host-2', 'HOST', '2026-10-21T10:02:00.000Z');
    const faces = seenFacesByLine(thread, [venue, cohost], 'host-1');
    expect([...faces.entries()]).toEqual([
      ['l2', [venue]],
      ['l3', [cohost]],
    ]);
    // Reading the thread newest-first never reorders it.
    expect(thread.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });

  it('gathers every member who stopped at the same line, in the order of their marks', () => {
    const venue = mark('venue-1', 'VENUE', '2026-10-21T10:05:00.000Z');
    const cohost = mark('host-2', 'HOST', '2026-10-21T10:09:00.000Z');
    const faces = seenFacesByLine(thread, [venue, cohost], 'host-1');
    expect(faces.get('l3')).toEqual([venue, cohost]);
    expect(faces.size).toBe(1);
  });

  it("never draws the reader's own face", () => {
    expect(seenFacesByLine(thread, [mark('host-1', 'HOST', '2026-10-21T10:05:00.000Z')], 'host-1').size).toBe(0);
  });

  it('draws no face for a member who has read none of the lines on screen', () => {
    expect(seenFacesByLine(thread, [mark('venue-1', 'VENUE', '2026-10-21T09:59:59.000Z')], 'host-1').size).toBe(0);
    expect(seenFacesByLine([], [mark('venue-1', 'VENUE', '2026-10-21T10:05:00.000Z')], 'host-1').size).toBe(0);
    expect(seenFacesByLine(thread, [], 'host-1').size).toBe(0);
  });

  it('draws every member while the reader is not known yet', () => {
    const first = mark('host-1', 'HOST', '2026-10-21T10:00:00.000Z');
    expect(seenFacesByLine(thread, [first], null).get('l1')).toEqual([first]);
    expect(seenFacesByLine(thread, [first], undefined).get('l1')).toEqual([first]);
  });
});

describe('seenByOtherSide', () => {
  const sent = line('l2', '2026-10-21T10:01:00.000Z');

  it('is true once someone on the other side has read up to the line', () => {
    expect(seenByOtherSide(sent, [mark('venue-1', 'VENUE', '2026-10-21T10:05:00.000Z')], 'HOST')).toBe(true);
    expect(seenByOtherSide(sent, [mark('venue-1', 'VENUE', '2026-10-21T10:01:00.000Z')], 'HOST')).toBe(true);
    expect(seenByOtherSide(sent, [mark('host-2', 'HOST', '2026-10-21T10:05:00.000Z')], 'VENUE')).toBe(true);
  });

  it('is false while the other side has read only as far as an earlier line', () => {
    expect(seenByOtherSide(sent, [mark('venue-1', 'VENUE', '2026-10-21T10:00:59.000Z')], 'HOST')).toBe(false);
  });

  it("ignores the reader's own side, and is false with no marks at all", () => {
    expect(seenByOtherSide(sent, [mark('host-2', 'HOST', '2026-10-21T10:05:00.000Z')], 'HOST')).toBe(false);
    expect(seenByOtherSide(sent, [], 'VENUE')).toBe(false);
  });
});

describe('venueChatLineActions', () => {
  const at = '2026-10-21T10:00:00.000Z';
  const reactOnly = { react: true, edit: false, remove: false };

  it('lets the author rewrite or take back their own text', () => {
    expect(venueChatLineActions(line('l1', at), 'host-1')).toEqual({ react: true, edit: true, remove: true });
  });

  it('lets the author take back their own photo, but not rewrite it', () => {
    const photo = line('l1', at, { type: 'IMAGE', text: null, image_url: 'https://ik.imagekit.io/x/p.jpg' });
    expect(venueChatLineActions(photo, 'host-1')).toEqual({ react: true, edit: false, remove: true });
  });

  it("changes the author's offer line only through the offer itself", () => {
    expect(venueChatLineActions(line('l1', at, { type: 'OFFER' }), 'host-1')).toEqual(reactOnly);
  });

  it('lets the author neither rewrite nor remove a kind of line this client does not know', () => {
    expect(venueChatLineActions(line('l1', at, { type: 'VOICE' }), 'host-1')).toEqual(reactOnly);
  });

  it("lets everyone else only react, and never matches a reader who is not known", () => {
    expect(venueChatLineActions(line('l1', at), 'venue-1')).toEqual(reactOnly);
    expect(venueChatLineActions(line('l1', at), null)).toEqual(reactOnly);
    expect(venueChatLineActions(line('l1', at), undefined)).toEqual(reactOnly);
    expect(venueChatLineActions(line('l1', at, { user_id: '' }), '')).toEqual(reactOnly);
  });

  it('offers nothing on a removed line, even to its author', () => {
    expect(venueChatLineActions(line('l1', at, { deleted: true }), 'host-1')).toEqual({ react: false, edit: false, remove: false });
    expect(venueChatLineActions(line('l1', at, { deleted: true }), 'venue-1')).toEqual({ react: false, edit: false, remove: false });
  });
});

describe('reactionGroups', () => {
  it('draws one chip per emoji, in the order each was first used, with how many', () => {
    const reactions = [
      { user_id: 'venue-1', emoji: heart },
      { user_id: 'host-2', emoji: thumbs },
      { user_id: 'host-3', emoji: heart },
    ];
    expect(reactionGroups(reactions, 'host-1')).toEqual([
      { emoji: heart, count: 2, mine: false },
      { emoji: thumbs, count: 1, mine: false },
    ]);
  });

  it("marks a chip the reader is part of, wherever their reaction falls", () => {
    const reactions = [
      { user_id: 'host-1', emoji: thumbs },
      { user_id: 'venue-1', emoji: thumbs },
      { user_id: 'venue-1', emoji: party },
      { user_id: 'host-1', emoji: party },
      { user_id: 'venue-1', emoji: fire },
    ];
    expect(reactionGroups(reactions, 'host-1')).toEqual([
      { emoji: thumbs, count: 2, mine: true },
      { emoji: party, count: 2, mine: true },
      { emoji: fire, count: 1, mine: false },
    ]);
  });

  it("marks nothing as the reader's while the reader is not known", () => {
    expect(reactionGroups([{ user_id: 'host-1', emoji: thumbs }], null)).toEqual([{ emoji: thumbs, count: 1, mine: false }]);
    expect(reactionGroups([{ user_id: '', emoji: thumbs }], '')).toEqual([{ emoji: thumbs, count: 1, mine: false }]);
  });

  it('draws no chips on a line nobody reacted to, or from an older server', () => {
    expect(reactionGroups([], 'host-1')).toEqual([]);
    expect(reactionGroups(null, 'host-1')).toEqual([]);
    expect(reactionGroups(undefined, 'host-1')).toEqual([]);
  });
});
