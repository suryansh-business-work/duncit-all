import { describe, expect, it } from 'vitest';
import type { TableQueryState } from '@duncit/table';
import { applyPromptTableState } from './promptTableRows';
import type { AiPrompt } from './queries';

const prompt = (over: Partial<AiPrompt>): AiPrompt => ({
  id: 'p1',
  name: 'Prompt',
  description: '',
  content: 'content',
  category: 'General',
  target_model: '',
  token_count: 10,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
  ...over,
});

// Server order of aiPrompts: is_active desc, then name asc.
const rows: AiPrompt[] = [
  prompt({ id: 'a', name: 'Alpha', category: 'Support', token_count: 30, created_at: '2026-01-10T00:00:00.000Z' }),
  prompt({ id: 'b', name: 'Beta', category: 'Sales', token_count: 5, created_at: '2026-02-10T00:00:00.000Z' }),
  prompt({ id: 'c', name: 'Gamma', category: 'Support Ops', token_count: 90, created_at: '2026-03-10T00:00:00.000Z' }),
  prompt({ id: 'd', name: 'Delta', category: 'General', token_count: 50, is_active: false, created_at: null }),
];

const query = (over: Partial<TableQueryState>): TableQueryState => ({
  search: '',
  page: 1,
  pageSize: 25,
  sortBy: null,
  sortDir: 'asc',
  filters: [],
  ...over,
});

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

  it('applies a case-insensitive contains filter on category', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'category', op: 'contains', value: 'support' }] }),
    );
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'c']);
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

  it('excludes rows with a missing date from date range filters', () => {
    const page = applyPromptTableState(
      rows,
      query({ filters: [{ field: 'created_at', op: 'lte', value: '2026-12-31T00:00:00.000Z' }] }),
    );
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
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
