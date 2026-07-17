import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatLatency,
  formatTime,
  formatUptime,
} from './format';

describe('formatUptime', () => {
  it('formats a percentage with two decimals', () => {
    expect(formatUptime(100)).toBe('100.00%');
    expect(formatUptime(95.833)).toBe('95.83%');
    expect(formatUptime(0)).toBe('0.00%');
  });

  it('shows a dash when there is no data', () => {
    expect(formatUptime(null)).toBe('—');
    expect(formatUptime(undefined)).toBe('—');
  });
});

describe('formatLatency', () => {
  it('rounds to whole milliseconds', () => {
    expect(formatLatency(120.4)).toBe('120 ms');
  });

  it('shows a dash when missing', () => {
    expect(formatLatency(null)).toBe('—');
  });
});

describe('formatDate', () => {
  it('renders a readable date for a valid ISO string', () => {
    const out = formatDate('2026-07-11T10:30:00.000Z');
    expect(out).toContain('2026');
    expect(out).not.toBe('—');
  });

  it('shows a dash for null or unparseable input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatTime', () => {
  it('renders a time for a valid ISO string', () => {
    const out = formatTime('2026-07-11T10:30:00.000Z');
    expect(typeof out).toBe('string');
    expect(out).not.toBe('—');
  });

  it('shows a dash for null or unparseable input', () => {
    expect(formatTime(null)).toBe('—');
    expect(formatTime('nope')).toBe('—');
  });
});

describe('formatBytes', () => {
  it('scales through the units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
  });

  it('treats negative sizes as empty', () => {
    expect(formatBytes(-5)).toBe('0 B');
  });

  it('keeps whole bytes and drops decimals once past 100', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(500 * 1024)).toBe('500 KB');
  });

  it('clamps to the largest unit for very large sizes', () => {
    expect(formatBytes(5 * 1024 ** 5)).toBe('5120 TB');
  });
});

describe('formatDuration', () => {
  it('renders days/hours/minutes compactly', () => {
    expect(formatDuration(30)).toBe('<1m');
    expect(formatDuration(5 * 60)).toBe('5m');
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe('3h 5m');
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h');
  });

  it('drops the minutes segment once there are whole days', () => {
    expect(formatDuration(2 * 86400 + 4 * 3600 + 5 * 60)).toBe('2d 4h');
  });
});
