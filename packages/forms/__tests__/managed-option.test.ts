import { describe, expect, it } from 'vitest';
import { makeManagedOptionSchema, managedOptionDefaults, toManagedOptionInput } from '../src/schemas';

/** An Amenities / Event Suitability entry: the key is echoed, so each assertion names the message shown. */
const schema = makeManagedOptionSchema((key) => key);
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeManagedOptionSchema', () => {
  it('asks for a name, and a blank one is still blank once trimmed', () => {
    expect(messages(managedOptionDefaults)).toEqual(['crm.data.optionNameRequired']);
    expect(messages({ ...managedOptionDefaults, name: '   ' })).toEqual(['crm.data.optionNameRequired']);
  });

  it('takes a blank place, and refuses a place that is not a whole number from 0 up', () => {
    expect(messages({ name: 'Parking', sort_order: null, is_active: true })).toEqual([]);
    expect(messages({ name: 'Parking', sort_order: Number.NaN, is_active: true })).toEqual(['crm.data.optionOrderInvalid']);
    expect(messages({ name: 'Parking', sort_order: 1.5, is_active: true })).toEqual(['crm.data.optionOrderInvalid']);
    expect(messages({ name: 'Parking', sort_order: -1, is_active: true })).toEqual(['crm.data.optionOrderInvalid']);
  });
});

describe('toManagedOptionInput', () => {
  it('trims the name and saves a blank place as the top of the list', () => {
    expect(toManagedOptionInput({ name: ' AC ', sort_order: null, is_active: false })).toEqual({
      name: 'AC',
      sort_order: 0,
      is_active: false,
    });
    expect(toManagedOptionInput({ name: 'Stage', sort_order: 4, is_active: true }).sort_order).toBe(4);
  });
});
