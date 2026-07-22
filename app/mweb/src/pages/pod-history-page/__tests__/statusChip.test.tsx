import { describe, it, expect } from 'vitest';
import { STATUS_CHIP } from '../statusChip';
import type { StatusChipMeta } from '../statusChip';

describe('STATUS_CHIP', () => {
  it('maps every booking status to chip meta', () => {
    expect(STATUS_CHIP.JOINED).toEqual({ label: 'Joined', color: 'success' });
    expect(STATUS_CHIP.BACKOUT_IN_PROCESS).toEqual({
      label: 'Backout in process',
      color: 'warning',
    });
    expect(STATUS_CHIP.BACKED_OUT).toEqual({ label: 'Backed out', color: 'warning' });
  });

  it('covers exactly the three known statuses', () => {
    expect(Object.keys(STATUS_CHIP).sort()).toEqual(
      ['BACKED_OUT', 'BACKOUT_IN_PROCESS', 'JOINED'].sort(),
    );
  });

  it('uses only allowed chip colors', () => {
    const allowed = new Set<StatusChipMeta['color']>(['success', 'warning']);
    for (const meta of Object.values(STATUS_CHIP)) {
      expect(allowed.has(meta.color)).toBe(true);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it('marks only JOINED as success', () => {
    const successKeys = Object.entries(STATUS_CHIP)
      .filter(([, m]) => m.color === 'success')
      .map(([k]) => k);
    expect(successKeys).toEqual(['JOINED']);
  });
});
