import { describe, expect, it } from 'vitest';
import {
  DRAFT_EXPIRY_WARNING_MS,
  draftHoursLeft,
  draftMsLeft,
  isDraftExpiringSoon,
  splitDraftsByExpiry,
} from '../src/pod-draft';

/** A fixed "now" so the countdown never depends on when the suite runs. */
const NOW = new Date('2026-08-28T10:00:00.000Z').getTime();
const at = (iso: string) => ({ expires_at: iso });
const inHours = (hours: number) => at(new Date(NOW + hours * 60 * 60 * 1000).toISOString());

describe('draftMsLeft', () => {
  it('counts down to the server-stamped deletion date', () => {
    expect(draftMsLeft(inHours(12), NOW)).toBe(12 * 60 * 60 * 1000);
  });

  it('goes negative once the date is past — the sweep runs daily, so a draft can outlive it', () => {
    expect(draftMsLeft(inHours(-5), NOW)).toBe(-5 * 60 * 60 * 1000);
  });

  it('is null when the server sent no expiry, or one that cannot be read', () => {
    expect(draftMsLeft({}, NOW)).toBeNull();
    expect(draftMsLeft({ expires_at: null }, NOW)).toBeNull();
    expect(draftMsLeft({ expires_at: '' }, NOW)).toBeNull();
    expect(draftMsLeft({ expires_at: 'not-a-date' }, NOW)).toBeNull();
  });

  it('reads the clock itself when the caller does not pass one', () => {
    expect(draftMsLeft({ expires_at: new Date(Date.now() + 60_000).toISOString() })).toBeGreaterThan(0);
  });
});

describe('isDraftExpiringSoon', () => {
  it('warns inside the last day, and at the boundary itself', () => {
    expect(isDraftExpiringSoon(inHours(3), NOW)).toBe(true);
    expect(isDraftExpiringSoon(at(new Date(NOW + DRAFT_EXPIRY_WARNING_MS).toISOString()), NOW)).toBe(true);
  });

  it('still warns on a draft that is already past due', () => {
    expect(isDraftExpiringSoon(inHours(-2), NOW)).toBe(true);
  });

  it('stays quiet outside the window, and for a draft with no date at all', () => {
    expect(isDraftExpiringSoon(inHours(48), NOW)).toBe(false);
    expect(isDraftExpiringSoon({}, NOW)).toBe(false);
  });

  it('reads the clock itself when the caller does not pass one', () => {
    expect(isDraftExpiringSoon({ expires_at: new Date(Date.now() + 60_000).toISOString() })).toBe(true);
  });
});

describe('draftHoursLeft', () => {
  it('floors to whole hours, which is what the chip counts down', () => {
    expect(draftHoursLeft(inHours(5), NOW)).toBe(5);
    expect(draftHoursLeft(at(new Date(NOW + 5.9 * 60 * 60 * 1000).toISOString()), NOW)).toBe(5);
  });

  it('reads the last hour as 0 rather than a negative number', () => {
    expect(draftHoursLeft(at(new Date(NOW + 30 * 60 * 1000).toISOString()), NOW)).toBe(0);
  });

  it('is 0 for a past-due draft and for one with no date', () => {
    expect(draftHoursLeft(inHours(-3), NOW)).toBe(0);
    expect(draftHoursLeft(at(new Date(NOW).toISOString()), NOW)).toBe(0);
    expect(draftHoursLeft({}, NOW)).toBe(0);
  });

  it('reads the clock itself when the caller does not pass one', () => {
    expect(draftHoursLeft({ expires_at: new Date(Date.now() - 60_000).toISOString() })).toBe(0);
  });
});

describe('splitDraftsByExpiry', () => {
  it('leads with the draft that goes first, and keeps the rest in the server order', () => {
    const drafts = [
      { id: 'd-far', ...inHours(72) },
      { id: 'd-soon', ...inHours(6) },
      { id: 'd-sooner', ...inHours(1) },
      { id: 'd-none' },
      { id: 'd-later', ...inHours(30) },
    ];

    const { expiring, rest } = splitDraftsByExpiry(drafts, NOW);

    expect(expiring.map((d) => d.id)).toEqual(['d-sooner', 'd-soon']);
    expect(rest.map((d) => d.id)).toEqual(['d-far', 'd-none', 'd-later']);
  });

  it('sorts a past-due draft ahead of one still inside the window', () => {
    const drafts = [
      { id: 'd-soon', ...inHours(2) },
      { id: 'd-overdue', ...inHours(-8) },
    ];

    expect(splitDraftsByExpiry(drafts, NOW).expiring.map((d) => d.id)).toEqual([
      'd-overdue',
      'd-soon',
    ]);
  });

  it('answers with two empty lists for a host with no drafts', () => {
    expect(splitDraftsByExpiry([], NOW)).toEqual({ expiring: [], rest: [] });
  });

  it('reads the clock itself when the caller does not pass one', () => {
    const drafts = [{ id: 'd-1', expires_at: new Date(Date.now() + 60_000).toISOString() }];
    expect(splitDraftsByExpiry(drafts).expiring.map((d) => d.id)).toEqual(['d-1']);
  });
});
