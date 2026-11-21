import { describe, expect, it } from 'vitest';
import {
  SERVICE_TARGETS,
  defaultServiceTargets,
  flagForKind,
  hasAnyTarget,
  pickServiceTargets,
} from '@/config/serviceTargets';

const noneOn = {
  applies_to_venue: false,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
};

describe('SERVICE_TARGETS', () => {
  it('lists the five lead kinds once each, with the flag the server stores', () => {
    expect(SERVICE_TARGETS.map((t) => [t.kind, t.flag])).toEqual([
      ['VENUE', 'applies_to_venue'],
      ['HOST', 'applies_to_host'],
      ['ECOMM', 'applies_to_ecomm'],
      ['CREATOR', 'applies_to_creator'],
      ['COMMUNITY', 'applies_to_community'],
    ]);
  });
});

describe('defaultServiceTargets', () => {
  it('turns on venue and host, the kinds that predate the flags, and leaves the rest off', () => {
    expect(defaultServiceTargets()).toEqual({ ...noneOn, applies_to_venue: true, applies_to_host: true });
  });

  it('returns a fresh object each time', () => {
    const first = defaultServiceTargets();
    first.applies_to_ecomm = true;
    expect(defaultServiceTargets().applies_to_ecomm).toBe(false);
  });
});

describe('pickServiceTargets', () => {
  it('keeps only the five flags from a row that carries other fields', () => {
    const row = { id: 's1', title: 'Catering', ...noneOn, applies_to_ecomm: true, applies_to_community: true };
    expect(pickServiceTargets(row)).toEqual({ ...noneOn, applies_to_ecomm: true, applies_to_community: true });
  });

  it('treats a missing or non-true flag as off', () => {
    expect(pickServiceTargets({ applies_to_venue: true })).toEqual({ ...noneOn, applies_to_venue: true });
    expect(pickServiceTargets({})).toEqual(noneOn);
  });
});

describe('hasAnyTarget', () => {
  it('is false only when every kind is off', () => {
    expect(hasAnyTarget(noneOn)).toBe(false);
    for (const target of SERVICE_TARGETS) {
      expect(hasAnyTarget({ ...noneOn, [target.flag]: true })).toBe(true);
    }
  });
});

describe('flagForKind', () => {
  it('maps every lead kind to its catalogue flag', () => {
    expect(flagForKind('VENUE')).toBe('applies_to_venue');
    expect(flagForKind('HOST')).toBe('applies_to_host');
    expect(flagForKind('ECOMM')).toBe('applies_to_ecomm');
    expect(flagForKind('CREATOR')).toBe('applies_to_creator');
    expect(flagForKind('COMMUNITY')).toBe('applies_to_community');
  });
});
