import { describe, expect, it } from 'vitest';
import { RANGE_OPTIONS, levelColor } from '../../src/pages/telemetry-dashboard/queries';

describe('telemetry-dashboard queries', () => {
  it('maps each known level to its chip color', () => {
    expect(levelColor('error')).toBe('error');
    expect(levelColor('warn')).toBe('warning');
    expect(levelColor('info')).toBe('info');
    expect(levelColor('debug')).toBe('default');
  });

  it('falls back to default for an unknown level', () => {
    expect(levelColor('trace')).toBe('default');
  });

  it('exposes the range option catalogue', () => {
    expect(RANGE_OPTIONS.map((r) => r.value)).toEqual([1, 7, 30]);
  });
});
