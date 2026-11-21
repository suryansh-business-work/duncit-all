import { splitLogFilters } from '../../emailValidation.filters';

describe('splitLogFilters', () => {
  it('passes an input with neither field through untouched, with no base filter', () => {
    const input = { search: 'asha', page: 2, filters: [{ field: 'source', op: 'eq' as const, value: 'BULK' }] };
    expect(splitLogFilters(input)).toEqual({ input, base: {} });
  });

  it('copes with no input at all', () => {
    expect(splitLogFilters(null)).toEqual({ input: { filters: [] }, base: {} });
  });

  it('turns a verdict into the statuses it covers', () => {
    const { input, base } = splitLogFilters({ filters: [{ field: 'verdict', op: 'eq', value: 'RISKY' }] });
    expect(input.filters).toEqual([]);
    expect(base).toEqual({ $and: [{ status: { $in: ['RISKY', 'UNKNOWN'] } }] });
  });

  it('excludes every status of a verdict for ne, and joins verdicts for in', () => {
    expect(splitLogFilters({ filters: [{ field: 'verdict', op: 'ne', value: 'RISKY' }] }).base).toEqual({
      $and: [{ status: { $nin: ['RISKY', 'UNKNOWN'] } }],
    });
    expect(splitLogFilters({ filters: [{ field: 'verdict', op: 'in', values: ['VALID', 'INVALID'] }] }).base).toEqual({
      $and: [{ status: { $in: ['VERIFIED', 'INVALID'] } }],
    });
  });

  it('drops a verdict that names nothing, as the engine drops an unusable filter', () => {
    expect(splitLogFilters({ filters: [{ field: 'verdict', op: 'eq', value: 'MAYBE' }] }).base).toEqual({});
    expect(splitLogFilters({ filters: [{ field: 'verdict', op: 'eq', value: null }] }).base).toEqual({});
  });

  it('lets CRM match the checks recorded before consoles were', () => {
    expect(splitLogFilters({ filters: [{ field: 'portal', op: 'eq', value: 'crm' }] }).base).toEqual({
      $and: [{ portal: { $in: ['crm', null] } }],
    });
    expect(splitLogFilters({ filters: [{ field: 'portal', op: 'ne', value: 'crm' }] }).base).toEqual({
      $and: [{ portal: { $nin: ['crm', null] } }],
    });
  });

  it('matches any other console exactly', () => {
    expect(splitLogFilters({ filters: [{ field: 'portal', op: 'in', values: ['finance', 'support'] }] }).base).toEqual({
      $and: [{ portal: { $in: ['finance', 'support'] } }],
    });
  });

  it('drops an operator these fields cannot take and keeps the other filters', () => {
    const date = { field: 'created_at', op: 'gte' as const, value: '2026-11-01' };
    const { input, base } = splitLogFilters({
      filters: [{ field: 'portal', op: 'contains', value: 'fin' }, date, { field: 'verdict', op: 'eq', value: 'VALID' }],
    });
    expect(input.filters).toEqual([date]);
    expect(base).toEqual({ $and: [{ status: { $in: ['VERIFIED'] } }] });
  });
});
