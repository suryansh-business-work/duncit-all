import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const captured = vi.hoisted(() => ({
  columns: [] as Array<{ field: string; valueGetter?: (b: unknown) => unknown }>,
}));

vi.mock('@duncit/table', () => ({
  DuncitTable: (p: { columns: typeof captured.columns }) => {
    captured.columns = p.columns;
    return null;
  },
}));

import BugsTable from '../../src/pages/bugs-page/BugsTable';

describe('BugsTable column value getters', () => {
  it('derives the hidden first-seen, affected and environment values from the row', () => {
    render(
      <BugsTable
        fetchRows={vi.fn()}
        refetchRef={{ current: null }}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        selection={{ onChange: vi.fn(), clearRef: { current: null } }}
        onQueryChange={vi.fn()}
      />,
    );
    const row = {
      id: 'b1',
      first_seen_at: '2026-03-04T10:00:00.000Z',
      affected_user_count: 2,
      anonymous_count: 1,
      env_counts: { localhost: 0, staging: 0, production: 5 },
    } as unknown as BugRow;
    const col = (field: string) => captured.columns.find((c) => c.field === field);

    const firstSeen = col('first_seen_at')?.valueGetter?.(row);
    expect(typeof firstSeen).toBe('string');
    expect(firstSeen).toMatch(/2026/);
    expect(col('envs')?.valueGetter?.(row)).toBe('P 5');
    expect(col('envs')?.valueGetter?.({ ...row, env_counts: { localhost: 0, staging: 0, production: 0 } })).toBe('—');
  });
});
