import { describe, it, expect } from 'vitest';
import { STATUS_CHIP } from '../statusChip';
import type { StatusChipMeta } from '../statusChip';
import { fallbackT } from '../../../i18n/fallback';

describe('STATUS_CHIP', () => {
  it('maps every booking status to chip meta', () => {
    expect(STATUS_CHIP.JOINED).toEqual({ label: 'mweb.podHistory.statusJoined', color: 'success' });
    expect(STATUS_CHIP.BACKOUT_IN_PROCESS).toEqual({
      label: 'mweb.podHistory.statusBackoutInProcess',
      color: 'warning',
    });
    expect(STATUS_CHIP.BACKED_OUT).toEqual({
      label: 'mweb.podHistory.statusBackedOut',
      color: 'warning',
    });
  });

  it('labels are translation keys that resolve to the bundled chip copy', () => {
    expect(fallbackT(STATUS_CHIP.JOINED.label)).toBe('Joined');
    expect(fallbackT(STATUS_CHIP.BACKOUT_IN_PROCESS.label)).toBe('Backout in process');
    expect(fallbackT(STATUS_CHIP.BACKED_OUT.label)).toBe('Backed out');
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
