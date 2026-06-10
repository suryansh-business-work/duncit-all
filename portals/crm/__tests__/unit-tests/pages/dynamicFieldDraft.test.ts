import { describe, expect, it } from 'vitest';
import {
  blankDraft,
  buildDynamicFieldInput,
  deriveName,
  draftFromRow,
  moveItem,
  type DraftState,
} from '@/pages/ManageDynamicFieldsPage/dynamicFieldDraft';
import type { CrmDynamicField } from '@/api/crm.types';

describe('deriveName', () => {
  it('lowercases and underscores a human label', () => {
    expect(deriveName('Budget Band')).toBe('budget_band');
    expect(deriveName('  GST %!  ')).toBe('gst');
    expect(deriveName('Already_ok')).toBe('already_ok');
  });
});

describe('moveItem', () => {
  it('moves an item to a new index immutably', () => {
    const arr = ['a', 'b', 'c'];
    expect(moveItem(arr, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(arr).toEqual(['a', 'b', 'c']); // unchanged
  });

  it('is a no-op for equal or out-of-range indices', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('buildDynamicFieldInput', () => {
  const base: DraftState = { ...blankDraft, label: 'Region' };

  it('rejects an empty label', () => {
    const r = buildDynamicFieldInput({ ...base, label: '   ' }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Label is required/);
  });

  it('rejects when neither venue nor host applies', () => {
    const r = buildDynamicFieldInput({ ...base, applies_to_venue: false, applies_to_host: false }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Venue \/ Host/);
  });

  it('derives the key from the label for a new field', () => {
    const r = buildDynamicFieldInput({ ...base, label: 'Venue Region' }, 3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.name).toBe('venue_region');
      expect(r.input.sort_order).toBe(3);
      expect(r.input.multi).toBe(false);
      expect(r.input.options).toEqual([]);
    }
  });

  it('keeps the existing key when editing', () => {
    const r = buildDynamicFieldInput({ ...base, id: 'x1', name: 'fixed_key', label: 'New Label' }, 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.name).toBe('fixed_key');
  });

  it('requires at least one option for select fields', () => {
    const r = buildDynamicFieldInput({ ...base, kind: 'select', options: [] }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least one option/i);
  });

  it('trims options, drops blanks, defaults label to value, and keeps multi', () => {
    const r = buildDynamicFieldInput(
      {
        ...base,
        kind: 'select',
        multi: true,
        options: [
          { value: ' a ', label: '' },
          { value: 'b', label: 'Bee' },
          { value: '', label: 'ignored' },
        ],
      },
      0
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.multi).toBe(true);
      expect(r.input.options).toEqual([
        { value: 'a', label: 'a' },
        { value: 'b', label: 'Bee' },
      ]);
    }
  });

  it('forces multi false for non-select kinds', () => {
    const r = buildDynamicFieldInput({ ...base, kind: 'text', multi: true }, 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.multi).toBe(false);
  });
});

describe('draftFromRow', () => {
  it('maps a server row into an editable draft', () => {
    const row = {
      id: 'f1',
      name: 'budget',
      label: 'Budget',
      kind: 'select',
      options: [{ value: 'lo', label: 'Low' }],
      multi: true,
      placeholder: 'pick',
      default_value: 'lo',
      hint: 'help',
      applies_to_venue: true,
      applies_to_host: false,
      required: true,
      sort_order: 2,
      is_active: false,
    } as CrmDynamicField;
    const draft = draftFromRow(row);
    expect(draft).toMatchObject({
      id: 'f1',
      name: 'budget',
      multi: true,
      placeholder: 'pick',
      default_value: 'lo',
      hint: 'help',
      required: true,
      is_active: false,
    });
    expect(draft.options).toEqual([{ value: 'lo', label: 'Low' }]);
  });
});
