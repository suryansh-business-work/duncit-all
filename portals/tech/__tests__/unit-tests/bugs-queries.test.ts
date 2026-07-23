import { describe, expect, it } from 'vitest';
import { STATUS_OPTIONS, statusColor } from '../../src/pages/bugs-page/queries';

describe('bugs-page queries', () => {
  it('maps each known status to its chip color', () => {
    expect(statusColor('OPEN')).toBe('error');
    expect(statusColor('RESOLVED')).toBe('success');
    expect(statusColor('IGNORED')).toBe('default');
  });

  it('falls back to default for an unknown status', () => {
    expect(statusColor('WHATEVER' as never)).toBe('default');
  });

  it('exposes the status option catalogue', () => {
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(['OPEN', 'RESOLVED', 'IGNORED']);
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(['Open', 'Resolved', 'Ignored']);
  });
});
