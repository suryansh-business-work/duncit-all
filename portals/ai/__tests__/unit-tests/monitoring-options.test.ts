import { describe, expect, it } from 'vitest';
import {
  ACTION_OPTIONS,
  RESULT_OPTIONS,
  STATUS_OPTIONS,
  SURFACE_OPTIONS,
  options,
} from '../../src/pages/ai-monitoring/queries';

/**
 * The filter options on the AI Monitoring log.
 *
 * These are the words a reviewer filters by, so the thing worth holding is that
 * every value HAS words — and that a value someone forgets to label still
 * renders as itself rather than as a blank row in the dropdown.
 */
describe('options', () => {
  it('labels each value from the catalogue it is given', () => {
    expect(options(['LOW', 'HIGH'], { LOW: 'Low risk', HIGH: 'High risk' })).toEqual([
      { value: 'LOW', label: 'Low risk' },
      { value: 'HIGH', label: 'High risk' },
    ]);
  });

  it('falls back to the raw value when a label was forgotten', () => {
    // The failure this prevents: a new status is added to the list and its
    // wording is not, so the filter shows an unselectable blank.
    expect(options(['LOW', 'CRITICAL'], { LOW: 'Low risk' })).toEqual([
      { value: 'LOW', label: 'Low risk' },
      { value: 'CRITICAL', label: 'CRITICAL' },
    ]);
  });
});

describe('the shipped option lists', () => {
  it('give every value real words, never the bare code', () => {
    for (const list of [RESULT_OPTIONS, STATUS_OPTIONS, ACTION_OPTIONS, SURFACE_OPTIONS]) {
      expect(list.length).toBeGreaterThan(0);
      for (const option of list) {
        expect(option.label).not.toBe(option.value);
      }
    }
  });

  it('cover every state the log can be in', () => {
    expect(RESULT_OPTIONS.map((o) => o.value)).toEqual(['PENDING', 'LOW', 'MEDIUM', 'HIGH']);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'PENDING',
      'COMPLETED',
      'FAILED',
      'SKIPPED',
    ]);
    expect(ACTION_OPTIONS.map((o) => o.value)).toEqual([
      'NONE',
      'ALLOWED',
      'FLAGGED',
      'BLOCKED',
    ]);
    expect(SURFACE_OPTIONS.map((o) => o.value)).toEqual(['PORTALS', 'MOBILE', 'MWEB']);
  });
});
