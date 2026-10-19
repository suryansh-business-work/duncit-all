import { Types } from 'mongoose';
import { alertTargets } from '../../chat.notify';
import { MAX_MENTIONS, validMentions } from '../../chat.members';
import { muteEndsAt } from '../../chat.mute';
import { expoGrouping } from '@modules/engagement/notification/notification.service';

const id = () => new Types.ObjectId().toString();

describe('alertTargets', () => {
  const sender = id();
  const away = id();
  const present = id();
  const blocked = id();
  const muted = id();
  const mutedButMentioned = id();
  const base = {
    members: [sender, away, present, blocked, muted, mutedButMentioned, 'not-an-id', away],
    senderId: sender,
    present: new Set([present]),
    blocked: new Set([blocked]),
    muted: new Set([muted, mutedButMentioned]),
    mentioned: new Set([mutedButMentioned]),
  };

  it('alerts members who are away, once each, and a muted member who was mentioned', () => {
    expect(alertTargets(base)).toEqual([away, mutedButMentioned]);
  });

  it('never alerts the sender, a present, blocked or muted member, or a malformed id', () => {
    const targets = alertTargets(base);
    for (const skipped of [sender, present, blocked, muted, 'not-an-id']) {
      expect(targets).not.toContain(skipped);
    }
  });

  it('alerts nobody in a room of one', () => {
    expect(alertTargets({ ...base, members: [sender] })).toEqual([]);
  });
});

describe('validMentions', () => {
  const room = [id(), id(), id()];

  it('keeps unique room members and drops the sender', () => {
    expect(validMentions([room[1], room[1], room[0]], room, room[0])).toEqual({ ok: true, ids: [room[1]] });
  });

  it('refuses anyone outside the room', () => {
    expect(validMentions([id()], room, room[0])).toEqual({ ok: false, reason: 'NOT_MEMBER' });
  });

  it('refuses more than the cap', () => {
    const many = Array.from({ length: MAX_MENTIONS + 1 }, id);
    expect(validMentions(many, [...many, room[0]], room[0])).toEqual({ ok: false, reason: 'TOO_MANY' });
  });

  it('treats no mentions as none', () => {
    expect(validMentions(null, room, room[0])).toEqual({ ok: true, ids: [] });
  });
});

describe('muteEndsAt', () => {
  const now = Date.parse('2026-10-19T10:00:00Z');

  it('ends 8 hours or one week from now, and never for Always', () => {
    expect(muteEndsAt('EIGHT_HOURS', now)?.toISOString()).toBe('2026-10-19T18:00:00.000Z');
    expect(muteEndsAt('ONE_WEEK', now)?.toISOString()).toBe('2026-10-26T10:00:00.000Z');
    expect(muteEndsAt('ALWAYS', now)).toBeNull();
  });

  it('refuses an unknown length', () => {
    expect(() => muteEndsAt('FOREVER' as never, now)).toThrow('Unknown mute duration');
  });
});

describe('expoGrouping', () => {
  it('collapses a tagged push per room on both platforms', () => {
    expect(expoGrouping('chat:pod:1')).toEqual({ tag: 'chat:pod:1', threadId: 'chat:pod:1', collapseId: 'chat:pod:1' });
  });

  it('leaves an untagged push to stack as before', () => {
    expect(expoGrouping(undefined)).toEqual({});
    expect(expoGrouping('')).toEqual({});
  });
});
