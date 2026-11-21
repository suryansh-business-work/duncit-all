import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { formatDuration, useCallClock } from '@/components/call-window/useCallClock';
import { filterSegments } from '@/components/call-window/CallTranscriptPanel';
import { canStartCall } from '@/components/call-window/CallSetupPanel';
import { mergeSegment } from '@/components/call-window/useCallSession';
import type { CallSetup, TranscriptSegment } from '@/api/call.gql';

const seg = (seq: number, speaker: 'AGENT' | 'LEAD', text: string): TranscriptSegment => ({ seq, speaker, text, confidence: null, at: null });

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9.7, '0:09'],
    [65, '1:05'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [-5, '0:00'],
  ])('shows %s seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('useCallClock', () => {
  it('ticks from the answer time while the call is live, and holds the final figure after', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T10:00:10.000Z'));
    const { result, rerender } = renderHook(({ at, running }) => useCallClock(at, running), {
      initialProps: { at: '2026-11-22T10:00:00.000Z' as string | null, running: true },
    });
    expect(result.current).toBe(10);

    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current).toBe(13);

    rerender({ at: '2026-11-22T10:00:00.000Z', running: false });
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current).toBe(13);
  });

  it('reads zero before the contact picks up, or for a time that is not one', () => {
    const { result, rerender } = renderHook(({ at }) => useCallClock(at, true), { initialProps: { at: null as string | null } });
    expect(result.current).toBe(0);
    rerender({ at: 'not a time' });
    expect(result.current).toBe(0);
  });
});

describe('filterSegments', () => {
  const lines = [seg(1, 'AGENT', 'When suits you?'), seg(2, 'LEAD', 'Weekends work best')];

  it('keeps everything for an empty or blank search', () => {
    expect(filterSegments(lines, '')).toBe(lines);
    expect(filterSegments(lines, '   ')).toBe(lines);
  });

  it('matches case-insensitively on the text', () => {
    expect(filterSegments(lines, ' WEEKEND ')).toEqual([lines[1]]);
    expect(filterSegments(lines, 'pricing')).toEqual([]);
  });
});

describe('mergeSegment', () => {
  it('adds a new utterance in spoken order', () => {
    expect(mergeSegment([seg(2, 'LEAD', 'b')], seg(1, 'AGENT', 'a')).map((s) => s.seq)).toEqual([1, 2]);
  });

  it('ignores an utterance it already has, but not the same number from the other side', () => {
    const start = [seg(1, 'AGENT', 'a')];
    expect(mergeSegment(start, seg(1, 'AGENT', 'a'))).toBe(start);
    expect(mergeSegment(start, seg(1, 'LEAD', 'b'))).toHaveLength(2);
  });
});

describe('canStartCall', () => {
  const setup: CallSetup = {
    configured: true,
    missing: [],
    from_number: '+14155550100',
    agent_number: '+919800000000',
    agent_source: 'CONFIG',
    recording_enabled: true,
    live_transcription: true,
    can_configure: false,
  };

  it('needs Twilio, a Call From number, an agent phone and a contact number', () => {
    expect(canStartCall(setup, '98123')).toBe(true);
    expect(canStartCall(undefined, '98123')).toBe(false);
    expect(canStartCall({ ...setup, configured: false }, '98123')).toBe(false);
    expect(canStartCall({ ...setup, from_number: null }, '98123')).toBe(false);
    expect(canStartCall({ ...setup, agent_number: null }, '98123')).toBe(false);
    expect(canStartCall(setup, '  ')).toBe(false);
    expect(canStartCall(setup, undefined)).toBe(false);
  });
});
