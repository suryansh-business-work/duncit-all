import { describe, expect, it } from 'vitest';
import { portalNameOf, STATUS_FILTERS } from '../helpers';

describe('portalNameOf', () => {
  it('dashes a null portal key', () => {
    expect(portalNameOf(null)).toBe('—');
  });

  it('resolves a known portal key to its registered display name', () => {
    expect(portalNameOf('finance')).toBe('Finance');
    expect(portalNameOf('mweb')).toBe('Duncit App');
  });

  it('humanizes an unknown hyphenated key by title-casing each word', () => {
    expect(portalNameOf('some-unknown-portal')).toBe('Some Unknown Portal');
  });

  it('humanizes a single-word unknown key', () => {
    expect(portalNameOf('mystery')).toBe('Mystery');
  });
});

describe('STATUS_FILTERS', () => {
  it('orders Pending, Approved, Denied, then All (blank) last', () => {
    expect(STATUS_FILTERS.map((f) => f.value)).toEqual(['PENDING', 'APPROVED', 'DENIED', '']);
    expect(STATUS_FILTERS.map((f) => f.labelKey)).toEqual([
      'admin.portalAccess.statusPending',
      'admin.portalAccess.statusApproved',
      'admin.portalAccess.statusDenied',
      'admin.portalAccess.statusAll',
    ]);
  });
});
