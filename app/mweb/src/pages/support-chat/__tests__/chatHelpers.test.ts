import { describe, expect, it } from 'vitest';
import {
  DOCX_MIME,
  canReopen,
  dayLabel,
  showDaySeparator,
  transcriptMime,
  userMessageTick,
} from '../chatHelpers';
import { feedbackOptionFor, FEEDBACK_OPTIONS } from '../feedbackScale';
import type { SupportChatMessage } from '../queries';

const ZONE = 'Asia/Kolkata';

function msg(partial: Partial<SupportChatMessage>): SupportChatMessage {
  return {
    id: 'm1', session_id: 's1', sender_id: 'me', sender_role: 'USER', sender_name: '',
    sender_photo: null, text: 'hi', attachments: [], is_ai: false,
    created_at: '2026-06-26T05:00:00.000Z', ...partial,
  };
}

describe('userMessageTick (B12)', () => {
  it('returns failed before pending when a send errored', () => {
    expect(userMessageTick(msg({ failed: true, pending: true }), null)).toBe('failed');
  });
  it('returns pending while awaiting acknowledgement', () => {
    expect(userMessageTick(msg({ pending: true }), null)).toBe('pending');
  });
  it('returns seen once the agent read at/after the message time', () => {
    expect(userMessageTick(msg({ created_at: '2026-06-26T05:00:00.000Z' }), '2026-06-26T05:01:00.000Z')).toBe('seen');
  });
  it('returns delivered otherwise', () => {
    expect(userMessageTick(msg({}), null)).toBe('delivered');
  });
});

describe('day separators in the configured zone (B10)', () => {
  it('labels the current instant Today and an old instant by its zoned date', () => {
    expect(dayLabel(new Date().toISOString(), ZONE)).toBe('Today');
    expect(dayLabel('2020-01-15T00:00:00.000Z', ZONE)).toBe('15 Jan 2020');
  });
  it('labels yesterday relative to the configured zone', () => {
    const y = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(dayLabel(y, ZONE)).toBe('Yesterday');
  });
  it('shows a separator when two instants fall on different zoned days', () => {
    // 18:00Z (23:30 IST, 25 Jun) vs 19:00Z (00:30 IST, 26 Jun) → different days.
    expect(showDaySeparator('2026-06-25T19:00:00.000Z', '2026-06-25T18:00:00.000Z', ZONE)).toBe(true);
  });
  it('hides the separator within the same zoned day', () => {
    expect(showDaySeparator('2026-06-25T19:30:00.000Z', '2026-06-25T19:00:00.000Z', ZONE)).toBe(false);
  });
  it('always shows the separator for the first message', () => {
    expect(showDaySeparator('2026-06-25T19:00:00.000Z', undefined, ZONE)).toBe(true);
  });
});

describe('transcript download (B15)', () => {
  it('maps DOCX to the Office mime', () => {
    expect(transcriptMime('DOCX')).toBe(DOCX_MIME);
  });
  it('maps TXT to text/plain', () => {
    expect(transcriptMime('TXT')).toContain('text/plain');
  });
});

describe('reopen window guard', () => {
  it('allows reopen before the deadline and blocks after/invalid', () => {
    expect(canReopen(new Date(Date.now() + 60_000).toISOString())).toBe(true);
    expect(canReopen(new Date(Date.now() - 60_000).toISOString())).toBe(false);
    expect(canReopen(null)).toBe(false);
    expect(canReopen('not-a-date')).toBe(false);
  });
});

describe('feedback scale (B8)', () => {
  it('has the five locked emoji + labels in order', () => {
    expect(FEEDBACK_OPTIONS.map((o) => o.emoji)).toEqual(['😠', '🙁', '😐', '🙂', '😍']);
    expect(FEEDBACK_OPTIONS.map((o) => o.label)).toEqual([
      'Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied',
    ]);
  });
  it('looks up a rating and rejects out-of-range', () => {
    expect(feedbackOptionFor(5)?.emoji).toBe('😍');
    expect(feedbackOptionFor(null)).toBeNull();
    expect(feedbackOptionFor(9)).toBeNull();
  });
});
