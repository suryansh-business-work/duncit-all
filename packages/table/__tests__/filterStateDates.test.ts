import { endOfDay, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { formatDateCell } from '../src/cells';
import { fallbackT } from '../src/i18n';
import { draftToFilter, emptyDraft, filterChipLabel, filterToDraft } from '../src/toolbar/filterState';
import type { DuncitColumn } from '../src/types';

type Pod = Record<string, unknown>;

const created: DuncitColumn<Pod> = { field: 'created_at', headerName: 'Created', type: 'date' };

// Picked mid-afternoon on purpose: the filter must still cover the WHOLE day.
const FROM_PICK = new Date(2026, 8, 1, 15, 30);
const TO_PICK = new Date(2026, 8, 8, 9, 0);
const FROM_ISO = startOfDay(FROM_PICK).toISOString();
const TO_ISO = endOfDay(TO_PICK).toISOString();

const draft = (from: Date | null, to: Date | null) => ({ ...emptyDraft(created), from, to });

describe('date-range drafts', () => {
  it('applies whole days: from starts at midnight and to ends at the last millisecond of its day', () => {
    expect(draftToFilter(created, draft(FROM_PICK, TO_PICK))).toEqual({
      field: 'created_at',
      op: 'between',
      values: [FROM_ISO, TO_ISO],
    });
  });

  it('applies an open-ended range as gte or lte, and no filter with neither day picked', () => {
    expect(draftToFilter(created, draft(FROM_PICK, null))).toEqual({ field: 'created_at', op: 'gte', value: FROM_ISO });
    expect(draftToFilter(created, draft(null, TO_PICK))).toEqual({ field: 'created_at', op: 'lte', value: TO_ISO });
    expect(draftToFilter(created, draft(null, null))).toBeNull();
  });

  it('treats a half-typed (invalid) day as unpicked', () => {
    expect(draftToFilter(created, draft(new Date('not a date'), TO_PICK))).toEqual({
      field: 'created_at',
      op: 'lte',
      value: TO_ISO,
    });
  });
});

describe('reopening a date filter', () => {
  it('prefills both pickers from a between filter, and round-trips to the same filter', () => {
    const filter = { field: 'created_at', op: 'between' as const, values: [FROM_ISO, TO_ISO] };
    const reopened = filterToDraft(created, filter);
    expect(reopened.from?.getTime()).toBe(new Date(FROM_ISO).getTime());
    expect(reopened.to?.getTime()).toBe(new Date(TO_ISO).getTime());
    // Days go to the pickers, never to the text inputs.
    expect(reopened).toMatchObject({ value: '', valueTo: '' });
    expect(draftToFilter(created, reopened)).toEqual(filter);
  });

  it('fills only the "from" picker for gte and only the "to" picker for lte', () => {
    const gte = filterToDraft(created, { field: 'created_at', op: 'gte', value: FROM_ISO });
    expect(gte.from?.toISOString()).toBe(FROM_ISO);
    expect(gte.to).toBeNull();

    const lte = filterToDraft(created, { field: 'created_at', op: 'lte', value: TO_ISO });
    expect(lte.from).toBeNull();
    expect(lte.to?.toISOString()).toBe(TO_ISO);
  });

  it('leaves a picker empty for a bound that is missing or is not a date', () => {
    const unreadable = filterToDraft(created, { field: 'created_at', op: 'between', values: [FROM_ISO, 'not-a-date'] });
    expect(unreadable.from?.toISOString()).toBe(FROM_ISO);
    expect(unreadable.to).toBeNull();

    const bare = filterToDraft(created, { field: 'created_at', op: 'between' });
    expect(bare.from).toBeNull();
    expect(bare.to).toBeNull();
  });
});

describe('date filter chips', () => {
  it('show the days in the admin-configured date format', () => {
    expect(
      filterChipLabel([created], { field: 'created_at', op: 'between', values: [FROM_ISO, TO_ISO] }, fallbackT),
    ).toBe(`Created: ${formatDateCell(FROM_ISO)} – ${formatDateCell(TO_ISO)}`);
    expect(filterChipLabel([created], { field: 'created_at', op: 'gte', value: FROM_ISO }, fallbackT)).toBe(
      `Created ≥ ${formatDateCell(FROM_ISO)}`,
    );
  });
});
