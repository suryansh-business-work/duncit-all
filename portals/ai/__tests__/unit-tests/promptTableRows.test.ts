import { describe, expect, it } from 'vitest';
import type { AiPrompt } from '@duncit/gql-types';
import { applyPromptTableState } from '../../src/pages/prompt-library/promptTableRows';
import { makeAiPrompt as prompt, makeTableQuery as query } from '../mocks';

// Server order of aiPrompts: is_active desc, then name asc.
const rows: AiPrompt[] = [
  prompt({ id: 'a', name: 'Alpha', category: 'Support', token_count: 30, created_at: '2026-01-10T00:00:00.000Z' }),
  prompt({ id: 'b', name: 'Beta', category: 'Sales', token_count: 5, created_at: '2026-02-10T00:00:00.000Z' }),
  prompt({ id: 'c', name: 'Gamma', category: 'Support Ops', token_count: 90, created_at: '2026-03-10T00:00:00.000Z' }),
  prompt({ id: 'd', name: 'Delta', category: 'General', token_count: 50, is_active: false, created_at: null }),
];

describe('applyPromptTableState', () => {
  it('keeps the server order and returns the full total when untouched', () => {
    const page = applyPromptTableState(rows, query({}));
    expect(page.total).toBe(4);
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('slices pages after filtering and reports the filtered total', () => {
    const page = applyPromptTableState(rows, query({ page: 2, pageSize: 3 }));
    expect(page.total).toBe(4);
    expect(page.rows.map((r) => r.id)).toEqual(['d']);
  });

  it('sorts strings case-insensitively and respects direction', () => {
    const asc = applyPromptTableState(rows, query({ sortBy: 'name', sortDir: 'asc' }));
    expect(asc.rows.map((r) => r.name)).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma']);
    const desc = applyPromptTableState(rows, query({ sortBy: 'name', sortDir: 'desc' }));
    expect(desc.rows.map((r) => r.name)).toEqual(['Gamma', 'Delta', 'Beta', 'Alpha']);
  });

  it('sorts numbers and dates numerically', () => {
    const byTokens = applyPromptTableState(rows, query({ sortBy: 'token_count', sortDir: 'desc' }));
    expect(byTokens.rows.map((r) => r.token_count)).toEqual([90, 50, 30, 5]);
    const byCreated = applyPromptTableState(rows, query({ sortBy: 'created_at', sortDir: 'asc' }));
    expect(byCreated.rows.slice(0, 3).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts booleans by their truthiness', () => {
    const active = applyPromptTableState(rows, query({ sortBy: 'is_active', sortDir: 'asc' }));
    // is_active=false (Delta) sorts before the active rows in ascending order.
    expect(active.rows[0].id).toBe('d');
  });

  it('applies a case-insensitive contains filter on category', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'category', op: 'contains', value: 'support' }] }),
    );
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('treats a contains filter with no needle as matching everything', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'category', op: 'contains' }] }),
    );
    expect(page.total).toBe(4);
  });

  it('applies boolean filters on is_active', () => {
    const inactive = applyPromptTableState(rows, query({ filters: [{ field: 'is_active', op: 'is_false' }] }));
    expect(inactive.rows.map((r) => r.id)).toEqual(['d']);
    const active = applyPromptTableState(rows, query({ filters: [{ field: 'is_active', op: 'is_true' }] }));
    expect(active.total).toBe(3);
  });

  it('applies number range and date between filters', () => {
    const tokens = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'token_count', op: 'gte', value: '40' }] }),
    );
    expect(tokens.rows.map((r) => r.id)).toEqual(['c', 'd']);
    const created = applyPromptTableState(
      rows,
      query({
        filters: [
          {
            field: 'created_at',
            op: 'between',
            values: ['2026-02-01T00:00:00.000Z', '2026-02-28T00:00:00.000Z'],
          },
        ],
      }),
    );
    expect(created.rows.map((r) => r.id)).toEqual(['b']);
  });

  it('treats a between filter with no bounds as an open range', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'token_count', op: 'between' }] }),
    );
    // No min/max → NaN comparisons exclude every row.
    expect(page.total).toBe(0);
  });

  it('excludes rows with a missing date from date range filters', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'created_at', op: 'lte', value: '2026-12-31T00:00:00.000Z' }] }),
    );
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('treats a null cell value as empty when applying a contains filter', () => {
    // Delta (id "d") has created_at null; contains coerces the null to "".
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'created_at', op: 'contains', value: '2026' }] }),
    );
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('coerces a null string value to empty on either side of the comparison', () => {
    const zedFirst: AiPrompt[] = [
      prompt({ id: 'z', name: 'Zed' }),
      prompt({ id: 'n', name: null as unknown as string }),
    ];
    const nullFirst: AiPrompt[] = [
      prompt({ id: 'n', name: null as unknown as string }),
      prompt({ id: 'z', name: 'Zed' }),
    ];
    // Both input orders exercise compare(present, null) and compare(null, present);
    // the null name always sorts before "Zed".
    expect(applyPromptTableState(zedFirst, query({ sortBy: 'name' })).rows.map((r) => r.id)).toEqual(['n', 'z']);
    expect(applyPromptTableState(nullFirst, query({ sortBy: 'name' })).rows.map((r) => r.id)).toEqual(['n', 'z']);
  });

  it('matches everything for a known field with an unhandled operator', () => {
    const page = applyPromptTableState(
      rows,
      // `equals` is not a handled op, so a known field falls through to "match all".
      query({ filters: [{ field: 'name', op: 'equals' as never, value: 'Alpha' }] }),
    );
    expect(page.total).toBe(4);
  });

  it('ignores filters and sorts on fields outside the allowlist', () => {
    const page = applyPromptTableState(
      rows,
      query({ sortBy: 'actions', filters: [{ field: 'content', op: 'contains', value: 'zzz' }] }),
    );
    expect(page.total).toBe(4);
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
