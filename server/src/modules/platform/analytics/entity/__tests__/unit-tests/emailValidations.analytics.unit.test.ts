import { failureCounts, sourceCounts } from '../../emailValidations.analytics';
import type { FlagCombo } from '../../emailValidations.data';

const combo = (count: number, over: Partial<FlagCombo['_id']> = {}): FlagCombo => ({
  count,
  _id: {
    is_valid_syntax: true,
    accepts_mail: true,
    can_connect_smtp: true,
    is_deliverable: true,
    is_catch_all: false,
    has_full_inbox: false,
    is_disabled: false,
    is_disposable: false,
    is_role_account: false,
    ...over,
  },
});

describe('failureCounts', () => {
  it('counts each failed test once per check, weighted by how many checks share the flags', () => {
    const counts = failureCounts([
      combo(4),
      combo(3, { is_catch_all: true, is_role_account: true }),
      combo(2, { is_role_account: true }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ NOT_CATCH_ALL: 3, NOT_ROLE_ACCOUNT: 5 });
  });

  it('does not count a test that could not run as failed', () => {
    const counts = failureCounts([combo(5, { is_valid_syntax: false, accepts_mail: false, can_connect_smtp: false, is_deliverable: false })]);
    expect(Object.fromEntries(counts)).toEqual({ SYNTAX: 5 });
  });

  it('is empty when nothing was checked', () => {
    expect(failureCounts([]).size).toBe(0);
  });
});

describe('sourceCounts', () => {
  it('files a re-run under REVALIDATE whatever its source, and the rest under their source', () => {
    const counts = sourceCounts([
      { _id: { source: 'SINGLE', revalidation: false }, count: 6 },
      { _id: { source: 'SINGLE', revalidation: true }, count: 2 },
      { _id: { source: 'BULK', revalidation: false }, count: 40 },
    ]);
    expect(Object.fromEntries(counts)).toEqual({ SINGLE: 6, REVALIDATE: 2, BULK: 40 });
  });
});
