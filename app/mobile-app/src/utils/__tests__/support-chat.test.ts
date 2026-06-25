import {
  appendUnique,
  canReopen,
  dayLabel,
  durationLabel,
  formatTime,
  mergeReal,
  showDaySeparator,
  tickState,
} from '@/utils/support-chat';

describe('support-chat utils', () => {
  const at = (iso: string) => ({ id: 'x', created_at: iso });

  it('tickState reflects pending / seen / delivered', () => {
    expect(tickState({ id: 'a', created_at: '2020-01-01T00:00:00Z', pending: true })).toBe(
      'pending',
    );
    expect(tickState(at('2020-01-01T00:00:00Z'), '2020-01-02T00:00:00Z')).toBe('seen');
    expect(tickState(at('2020-01-02T00:00:00Z'), '2020-01-01T00:00:00Z')).toBe('delivered');
    expect(tickState(at('2020-01-02T00:00:00Z'), null)).toBe('delivered');
  });

  it('formatTime renders HH:mm and tolerates an invalid date', () => {
    expect(formatTime('2026-06-01T08:05:00Z')).toMatch(/^\d{2}:\d{2}$/);
    expect(formatTime('')).toBe('');
  });

  it('dayLabel returns Today / Yesterday / a date', () => {
    const now = new Date();
    const yest = new Date(now.getTime() - 86_400_000);
    expect(dayLabel(now.toISOString())).toBe('Today');
    expect(dayLabel(yest.toISOString())).toBe('Yesterday');
    expect(dayLabel('2000-06-03T10:00:00Z')).toMatch(/2000/);
  });

  it('showDaySeparator is true at the start and across day boundaries', () => {
    expect(showDaySeparator('2020-01-01T10:00:00Z')).toBe(true);
    expect(showDaySeparator('2020-01-01T11:00:00Z', '2020-01-01T09:00:00Z')).toBe(false);
    expect(showDaySeparator('2020-03-03T10:00:00Z', '2020-03-01T10:00:00Z')).toBe(true);
  });

  it('durationLabel formats seconds and minutes, null otherwise', () => {
    expect(durationLabel(null)).toBeNull();
    expect(durationLabel(0)).toBeNull();
    expect(durationLabel(45)).toBe('45s');
    expect(durationLabel(142)).toBe('2m 22s');
  });

  it('mergeReal replaces the temp message and de-dups', () => {
    const prev = [{ id: 'temp-1' }, { id: 'a' }];
    expect(mergeReal(prev, 'temp-1', { id: 'real' }).map((m) => m.id)).toEqual(['a', 'real']);
    expect(
      mergeReal([{ id: 'temp-1' }, { id: 'real' }], 'temp-1', { id: 'real' }).map((m) => m.id),
    ).toEqual(['real']);
  });

  it('appendUnique skips duplicates', () => {
    expect(appendUnique([{ id: 'a' }], { id: 'b' }).map((m) => m.id)).toEqual(['a', 'b']);
    expect(appendUnique([{ id: 'a' }], { id: 'a' }).map((m) => m.id)).toEqual(['a']);
  });

  it('canReopen gates the reopen window', () => {
    const now = new Date('2026-06-25T00:00:00Z');
    // No / invalid deadline → cannot reopen (parity with mWeb).
    expect(canReopen(null, now)).toBe(false);
    expect(canReopen(undefined, now)).toBe(false);
    expect(canReopen('not-a-date', now)).toBe(false);
    // Future deadline → open; past deadline → closed.
    expect(canReopen('2026-06-28T00:00:00Z', now)).toBe(true);
    expect(canReopen('2026-06-20T00:00:00Z', now)).toBe(false);
  });
});
