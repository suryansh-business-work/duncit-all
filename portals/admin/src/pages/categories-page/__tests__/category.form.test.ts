import { describe, expect, it } from 'vitest';
import { toCategoryInput, type CategoryFormValues } from '../category/category.form';

// category/category.form.cy.ts already exercises the schema's required/oneOf/
// min/max rules and toCategoryInput's per-level branch (undefined/SUB/CATEGORY/
// SUPER). This file fills in the truthy/falsy sides of toCategoryInput's own
// `||` fallbacks that file never happens to flip: a real icon, a real
// description, a non-zero sort order, and a co-host limit cast() lets through
// falsy (cast() coerces types but does not enforce the schema's min/max).
const base: CategoryFormValues = {
  name: 'Sports',
  iconMode: 'ICON',
  icon: 'sports',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
  allow_co_hosts: false,
  max_co_hosts: 1,
};

describe('toCategoryInput — truthy/falsy field coercion', () => {
  it('nulls out a blank icon instead of sending an empty string', () => {
    expect(toCategoryInput({ ...base, icon: '' }).icon).toBeNull();
  });

  it('keeps a real icon name instead of nulling it', () => {
    expect(toCategoryInput({ ...base, icon: 'SportsCricket' }).icon).toBe('SportsCricket');
  });

  it('keeps a real description instead of nulling it', () => {
    expect(toCategoryInput({ ...base, description: 'All cricket formats' }).description).toBe(
      'All cricket formats'
    );
  });

  it('nulls out a blank description', () => {
    expect(toCategoryInput({ ...base, description: '' }).description).toBeNull();
  });

  it('keeps a non-zero sort order as-is', () => {
    expect(toCategoryInput({ ...base, sort_order: 7 }).sort_order).toBe(7);
  });

  it('defaults a zero sort order to zero', () => {
    expect(toCategoryInput({ ...base, sort_order: 0 }).sort_order).toBe(0);
  });

  it('falls back to a co-host limit of 1 when the value is falsy', () => {
    // .cast() coerces types but does not enforce min/max, so a value the
    // schema's validate() would reject can still reach this fallback.
    const input = toCategoryInput({ ...base, allow_co_hosts: true, max_co_hosts: 0 }, 'SUB');
    expect(input).toMatchObject({ max_co_hosts: 1 });
  });

  it('keeps a real co-host limit as-is', () => {
    const input = toCategoryInput({ ...base, allow_co_hosts: true, max_co_hosts: 4 }, 'SUB');
    expect(input).toMatchObject({ max_co_hosts: 4 });
  });
});
