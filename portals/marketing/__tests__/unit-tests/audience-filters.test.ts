import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  buildFilters,
  EMPTY_FILTERS,
} from '../../src/pages/target-audience-page/audience-filters';

const withState = (over: Partial<typeof EMPTY_FILTERS>) => buildFilters({ ...EMPTY_FILTERS, ...over });

describe('buildFilters', () => {
  it('sends nothing when nothing is chosen', () => {
    expect(buildFilters(EMPTY_FILTERS)).toEqual([]);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  describe('age', () => {
    it('sends a between when both ends are set', () => {
      expect(withState({ ageMin: '18', ageMax: '30' })).toEqual([
        { field: 'age', op: 'between', values: ['18', '30'] },
      ]);
    });

    it('sends a one-sided bound when only one end is set', () => {
      expect(withState({ ageMin: '18' })).toEqual([{ field: 'age', op: 'gte', value: '18' }]);
      expect(withState({ ageMax: '30' })).toEqual([{ field: 'age', op: 'lte', value: '30' }]);
    });

    it('truncates a decimal and drops nonsense rather than sending it', () => {
      expect(withState({ ageMin: '18.7' })).toEqual([{ field: 'age', op: 'gte', value: '18' }]);
      expect(withState({ ageMin: 'abc' })).toEqual([]);
      expect(withState({ ageMin: '-4' })).toEqual([]);
      expect(withState({ ageMin: '   ' })).toEqual([]);
    });
  });

  it('sends every multi-select as an any-of', () => {
    expect(withState({ city: ['Pune', 'Delhi'], roles: ['HOST'] })).toEqual([
      { field: 'city', op: 'in', values: ['Pune', 'Delhi'] },
      { field: 'role', op: 'in', values: ['HOST'] },
    ]);
    expect(withState({ city: [] })).toEqual([]);
  });

  it('sends free text as a contains, trimmed', () => {
    expect(withState({ pincode: ' 411038 ' })).toEqual([
      { field: 'pincode', op: 'contains', value: '411038' },
    ]);
    expect(withState({ pincode: '   ' })).toEqual([]);
  });

  it('sends single selects as an equals', () => {
    expect(withState({ push: 'ANDROID', status: 'ACTIVE' })).toEqual([
      { field: 'push_platform', op: 'eq', value: 'ANDROID' },
      { field: 'status', op: 'eq', value: 'ACTIVE' },
    ]);
  });

  // Tri-state: unset asks nothing, which is not the same as asking for false.
  it('maps the three states of a yes/no filter', () => {
    expect(withState({ whatsapp: 'yes' })).toEqual([{ field: 'whatsapp', op: 'is_true' }]);
    expect(withState({ whatsapp: 'no' })).toEqual([{ field: 'whatsapp', op: 'is_false' }]);
    expect(withState({ whatsapp: '' })).toEqual([]);
  });

  describe('date ranges', () => {
    it('sends a between when both ends are set', () => {
      expect(withState({ joinedFrom: '2026-01-01', joinedTo: '2026-02-01' })).toEqual([
        { field: 'created_at', op: 'between', values: ['2026-01-01', '2026-02-01'] },
      ]);
    });

    it('sends a one-sided bound for an open range', () => {
      expect(withState({ activeFrom: '2026-01-01' })).toEqual([
        { field: 'last_login_at', op: 'gte', value: '2026-01-01' },
      ]);
      expect(withState({ activeTo: '2026-02-01' })).toEqual([
        { field: 'last_login_at', op: 'lte', value: '2026-02-01' },
      ]);
    });
  });

  it('names the three filters the server translates rather than compares', () => {
    const fields = withState({
      ageMin: '20',
      push: 'IOS',
      interests: ['c1'],
    }).map((f) => f.field);
    expect(fields).toEqual(['age', 'push_platform', 'interest_category']);
  });

  it('combines everything into one list, and counts it', () => {
    const state = {
      ...EMPTY_FILTERS,
      ageMin: '25',
      city: ['Pune'],
      push: 'ANDROID',
      whatsapp: 'yes' as const,
      emailVerified: 'no' as const,
      provider: 'GOOGLE',
      visibility: 'PUBLIC',
      surveyCompleted: 'yes' as const,
      firstTimeUser: 'no' as const,
      phoneVerified: 'yes' as const,
      locale: 'en-IN',
      country: ['India'],
      state: ['Maharashtra'],
      zone: ['Kothrud'],
      status: 'ACTIVE',
      joinedFrom: '2026-01-01',
    };
    expect(activeFilterCount(state)).toBe(16);
    expect(buildFilters(state)).toHaveLength(16);
  });
});
