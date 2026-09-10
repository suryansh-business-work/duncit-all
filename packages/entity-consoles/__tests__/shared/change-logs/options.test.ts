import { describe, expect, it } from 'vitest';
import {
  ACTION_COLORS,
  ACTOR_COLORS,
  actionOptions,
  actorOptions,
  labelOf,
  sourceOptions,
} from '../../../src/shared/change-logs/options';
import { lifecycleOptions } from '../../../src/shared/lifecycleOptions';

/**
 * The enum columns of the change log.
 *
 * One list per enum serves both the filter dropdown and the cell chip, so the
 * label an admin filters by is the label they just read. A value present in one
 * and missing from the other is the bug these cases exist to catch.
 */
const t = (key: string) => key;

describe('change-log options', () => {
  it('covers every action the server can store', () => {
    expect(actionOptions(t).map((o) => o.value)).toEqual(['CREATE', 'UPDATE', 'DELETE']);
  });

  it('covers every actor kind, and OWNER is the partner — not USER', () => {
    // The entity trail says OWNER where the user trail says USER: the partner a
    // record belongs to editing their own is not the same as an admin doing it.
    expect(actorOptions(t).map((o) => o.value)).toEqual(['OWNER', 'ADMIN', 'SYSTEM']);
  });

  it('covers all five surfaces a change can arrive from', () => {
    expect(sourceOptions(t).map((o) => o.value)).toEqual([
      'NATIVE',
      'MWEB',
      'ADMIN_PORTAL',
      'PORTAL',
      'SERVER',
    ]);
  });

  it('gives every action and actor a chip colour', () => {
    for (const option of actionOptions(t)) {
      expect(ACTION_COLORS[option.value as keyof typeof ACTION_COLORS]).toBeTruthy();
    }
    for (const option of actorOptions(t)) {
      expect(ACTOR_COLORS[option.value as keyof typeof ACTOR_COLORS]).toBeDefined();
    }
  });

  it('resolves a stored value to its label', () => {
    expect(labelOf(actionOptions(t), 'CREATE')).toBe('directory.changeLogs.actionCreate');
  });

  it('falls back to the raw value for something it has never seen', () => {
    // A new server enum must read as itself rather than as a blank cell.
    expect(labelOf(actionOptions(t), 'ARCHIVED')).toBe('ARCHIVED');
  });
});

describe('lifecycleOptions', () => {
  it('is the four states an application-shaped record moves through', () => {
    expect(lifecycleOptions(t).map((o) => o.value)).toEqual([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
    ]);
  });

  it('reads its labels from the venueEditor namespace every console ships', () => {
    expect(lifecycleOptions(t)[2].label).toBe('directory.venueEditor.statusApproved');
  });
});
