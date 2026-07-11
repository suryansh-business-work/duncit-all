import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatLatency, formatUptime } from './format';

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

describe('formatBytes', () => {
  it('scales through the units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
  });
});

describe('formatDuration', () => {
  it('renders days/hours/minutes compactly', () => {
    expect(formatDuration(30)).toBe('<1m');
    expect(formatDuration(5 * 60)).toBe('5m');
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe('3h 5m');
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h');
  });
});
