/**
 * The model's answer is untrusted text. Whatever it says, only a trimmed,
 * capped summary is stored, and only a real future date ever becomes a
 * reminder — a misread "last Monday" or "in 2099" must not land in an agent's
 * calendar.
 */
import { parseCallSummary } from '../../call.summary.parse';

const NOW = new Date('2026-11-22T10:00:00.000Z');
const answer = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    summary: '  The lead wants pricing for a 40-person event.  ',
    key_points: ['Needs a venue for 40', 'Budget unclear'],
    sentiment: 'positive',
    outcome: 'Interested, wants pricing',
    follow_ups: ['Send the price list'],
    follow_up_reminder: { title: 'Call back about pricing', due_at: '2026-11-24T11:00:00+05:30', notes: 'Bring the deck' },
    ...over,
  });

describe('parseCallSummary', () => {
  it('reads a complete answer, trimming the text and upper-casing the sentiment', () => {
    const parsed = parseCallSummary(answer(), NOW);

    expect(parsed).toEqual({
      text: 'The lead wants pricing for a 40-person event.',
      key_points: ['Needs a venue for 40', 'Budget unclear'],
      sentiment: 'POSITIVE',
      outcome: 'Interested, wants pricing',
      follow_ups: ['Send the price list'],
      reminder: { title: 'Call back about pricing', due_at: new Date('2026-11-24T05:30:00.000Z'), notes: 'Bring the deck' },
    });
  });

  it.each([
    ['not JSON at all', 'Sure! Here is the summary'],
    ['JSON null', 'null'],
    ['a JSON number', '42'],
    ['an empty answer', ''],
    ['no summary', answer({ summary: '   ' })],
    ['a summary that is not text', answer({ summary: 7 })],
  ])('refuses %s', (_label, content) => {
    expect(parseCallSummary(content, NOW)).toBeNull();
  });

  it('drops a sentiment it does not know rather than storing it', () => {
    expect(parseCallSummary(answer({ sentiment: 'ecstatic' }), NOW)?.sentiment).toBeNull();
    expect(parseCallSummary(answer({ sentiment: 3 }), NOW)?.sentiment).toBeNull();
  });

  it('keeps only non-empty text points, at most eight, each capped', () => {
    const many = Array.from({ length: 12 }, (_, i) => `Point ${i}`);
    const parsed = parseCallSummary(answer({ key_points: ['', 5, ...many], follow_ups: 'not a list' }), NOW);

    expect(parsed?.key_points).toHaveLength(8);
    expect(parsed?.key_points[0]).toBe('Point 0');
    expect(parsed?.follow_ups).toEqual([]);
    const long = parseCallSummary(answer({ key_points: ['x'.repeat(500)] }), NOW);
    expect(long?.key_points[0]).toHaveLength(300);
  });

  it('treats a missing outcome as empty', () => {
    expect(parseCallSummary(answer({ outcome: undefined }), NOW)?.outcome).toBe('');
  });

  it.each([
    ['no reminder', null],
    ['a reminder that is not an object', 'tomorrow'],
    ['a reminder with no title', { title: ' ', due_at: '2026-11-24T11:00:00Z' }],
    ['a date that is not one', { title: 'Call back', due_at: 'next week' }],
    ['a date already past', { title: 'Call back', due_at: '2026-11-21T11:00:00Z' }],
    ['a date exactly now', { title: 'Call back', due_at: NOW.toISOString() }],
    ['a date more than a year out', { title: 'Call back', due_at: '2028-01-01T00:00:00Z' }],
  ])('makes no reminder from %s', (_label, reminder) => {
    expect(parseCallSummary(answer({ follow_up_reminder: reminder }), NOW)?.reminder).toBeNull();
  });

  it('keeps a reminder without notes, with empty notes', () => {
    const parsed = parseCallSummary(answer({ follow_up_reminder: { title: 'Call back', due_at: '2026-11-23T10:00:00Z' } }), NOW);

    expect(parsed?.reminder).toEqual({ title: 'Call back', due_at: new Date('2026-11-23T10:00:00Z'), notes: '' });
  });

  it('measures "ahead" against the real clock when no time is given', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(parseCallSummary(answer({ follow_up_reminder: { title: 'Call back', due_at: future } }))?.reminder?.title).toBe('Call back');
  });
});
