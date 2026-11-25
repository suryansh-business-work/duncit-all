import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_FIELD_APPLIES,
  DYNAMIC_FIELD_KIND_KEY,
  DYNAMIC_FIELD_KINDS,
  deriveDynamicFieldName,
  dynamicFieldDefaults,
  dynamicFieldValuesFromRow,
  makeDynamicFieldSchema,
  moveDynamicFieldRow,
  toDynamicFieldInput,
  type DynamicFieldValues,
} from '../src/schemas/dynamic-field';

/** A CRM dynamic field: the key is echoed, so each assertion names the message shown (path first). */
const schema = makeDynamicFieldSchema((key) => key);
const problems = (values: DynamicFieldValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};
const region: DynamicFieldValues = { ...dynamicFieldDefaults, label: 'Region' };

describe('deriveDynamicFieldName', () => {
  it('lowercases a label and joins its words with underscores', () => {
    expect(deriveDynamicFieldName('Budget Band')).toBe('budget_band');
    expect(deriveDynamicFieldName('  GST %!  ')).toBe('gst');
    expect(deriveDynamicFieldName('Already_ok')).toBe('already_ok');
    expect(deriveDynamicFieldName('a_ b')).toBe('a__b');
    expect(deriveDynamicFieldName('__Top__')).toBe('top');
  });

  it('makes nothing from a label without letters or numbers', () => {
    expect(deriveDynamicFieldName('%%% !!')).toBe('');
    expect(deriveDynamicFieldName('')).toBe('');
  });
});

describe('makeDynamicFieldSchema', () => {
  it('accepts a labelled field on at least one lead kind', () => {
    expect(problems(region)).toEqual([]);
    expect(problems({ ...region, applies_to_venue: false, applies_to_host: false, applies_to_community: true })).toEqual([]);
  });

  it('asks for a label, a lead kind and a Select option, in the portal’s order', () => {
    expect(
      problems({ ...dynamicFieldDefaults, label: '  ', kind: 'select', applies_to_venue: false, applies_to_host: false }),
    ).toEqual([
      'label: crm.managedynamicfieldspage.labelRequired',
      'applies_to_venue: crm.managedynamicfieldspage.appliesRequired',
      'options: crm.managedynamicfieldspage.optionRequired',
    ]);
  });

  it('refuses a new label a key cannot be made from, but keeps an edited field’s saved key', () => {
    expect(problems({ ...region, label: '%%% !!' })).toEqual(['label: crm.managedynamicfieldspage.labelNeedsLetters']);
    expect(problems({ ...region, id: 'f1', name: 'fixed', label: '%%% !!' })).toEqual([]);
  });

  it('counts only Select options that have a value', () => {
    expect(problems({ ...region, kind: 'select', options: [{ value: '  ', label: 'Blank' }] })).toEqual([
      'options: crm.managedynamicfieldspage.optionRequired',
    ]);
    expect(problems({ ...region, kind: 'select', options: [{ value: 'lo', label: '' }] })).toEqual([]);
  });
});

describe('toDynamicFieldInput', () => {
  it('makes a new field’s key from its label and drops options and multi for other kinds', () => {
    const input = toDynamicFieldInput({ ...region, label: ' Venue Region ', multi: true, options: [{ value: 'a', label: 'A' }], hint: ' Pick one ' }, 3);
    expect(input).toMatchObject({ name: 'venue_region', label: 'Venue Region', options: [], multi: false, hint: 'Pick one', sort_order: 3 });
  });

  it('keeps an edited field’s key, and cleans and keeps a Select’s options and multi', () => {
    const input = toDynamicFieldInput(
      {
        ...region,
        id: 'f1',
        name: 'fixed_key',
        kind: 'select',
        multi: true,
        options: [
          { value: ' a ', label: '' },
          { value: 'b', label: 'Bee' },
          { value: '', label: 'ignored' },
        ],
      },
      0,
    );
    expect(input).toMatchObject({ name: 'fixed_key', multi: true, options: [{ value: 'a', label: 'a' }, { value: 'b', label: 'Bee' }] });
  });
});

describe('dynamicFieldValuesFromRow', () => {
  it('reads a saved row back, blanks for missing text and off for missing flags', () => {
    const values = dynamicFieldValuesFromRow({
      id: 'f2',
      name: 'region',
      label: 'Region',
      kind: 'select',
      options: [{ value: 'n', label: 'North' }],
      multi: null,
      placeholder: null,
      default_value: undefined,
      hint: null,
      applies_to_venue: false,
      applies_to_host: true,
      applies_to_ecomm: true,
      applies_to_creator: null,
      required: true,
      is_active: false,
    });
    expect(values).toEqual({
      id: 'f2',
      name: 'region',
      label: 'Region',
      kind: 'select',
      multi: false,
      options: [{ value: 'n', label: 'North' }],
      placeholder: '',
      default_value: '',
      hint: '',
      applies_to_venue: false,
      applies_to_host: true,
      applies_to_ecomm: true,
      applies_to_creator: false,
      applies_to_community: false,
      required: true,
      is_active: false,
    });
    expect(
      dynamicFieldValuesFromRow({ ...values, id: 'f3', placeholder: 'pick', default_value: 'n', hint: 'help', multi: true, applies_to_community: true }),
    ).toMatchObject({ placeholder: 'pick', default_value: 'n', hint: 'help', multi: true, applies_to_community: true });
  });
});

describe('moveDynamicFieldRow', () => {
  it('moves a row without changing the list it was given', () => {
    const rows = ['a', 'b', 'c'];
    expect(moveDynamicFieldRow(rows, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveDynamicFieldRow(rows, 2, 1)).toEqual(['a', 'c', 'b']);
    expect(rows).toEqual(['a', 'b', 'c']);
  });

  it('changes nothing for an equal or out-of-range move', () => {
    expect(moveDynamicFieldRow(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveDynamicFieldRow(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moveDynamicFieldRow(['a', 'b'], 2, 0)).toEqual(['a', 'b']);
    expect(moveDynamicFieldRow(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveDynamicFieldRow(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('kinds and lead kinds', () => {
  it('names every kind and every lead kind a field can apply to', () => {
    expect(Object.keys(DYNAMIC_FIELD_KIND_KEY)).toEqual([...DYNAMIC_FIELD_KINDS]);
    expect(DYNAMIC_FIELD_APPLIES.map(({ flag }) => flag)).toEqual([
      'applies_to_venue',
      'applies_to_host',
      'applies_to_ecomm',
      'applies_to_creator',
      'applies_to_community',
    ]);
  });
});
