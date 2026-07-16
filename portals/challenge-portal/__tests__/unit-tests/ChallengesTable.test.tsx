import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

const useQueryMock = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: useQueryMock,
}));
vi.mock('@duncit/table', () => ({
  DuncitTable: (props: Record<string, unknown>) => {
    captured.props = props;
    return <div data-testid="duncit-table" />;
  },
  actionsColumn: (opts: unknown) => ({ kind: 'actions', opts }),
  activeChipColumn: (opts: unknown) => ({ kind: 'active', opts }),
  dateColumn: () => ({ kind: 'date' }),
}));

import ChallengesTable from '../../src/pages/challenges/ChallengesTable';

const row = {
  id: 'c9',
  name: 'Sample',
  description: 'A short blurb',
  super_category_name: 'Sports',
  category_name: null,
  is_active: true,
  created_at: '2026-02-02',
};

const onEdit = vi.fn();
const onDelete = vi.fn();

const renderTable = () =>
  render(
    <ChallengesTable
      fetchRows={vi.fn() as never}
      refetchRef={createRef()}
      toolbarActions={<button type="button">tb</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );

const cols = () => captured.props?.columns as Array<Record<string, any>>;
const col = (field: string) => cols().find((c) => c.field === field)!;

describe('ChallengesTable', () => {
  beforeEach(() => {
    captured.props = null;
    useQueryMock.mockReset().mockImplementation((_doc: unknown, opts: any) => {
      const level = opts?.variables?.filter?.level;
      if (level === 'SUPER') return { data: { categories: [{ id: 's1', name: 'Super 1' }] } };
      if (level === 'CATEGORY') return { data: { categories: [{ id: 'c1', name: 'Cat 1' }] } };
      return { data: undefined }; // SUB → exercises the `?? []` fallback
    });
  });

  it('wires the shared DuncitTable with the portal config', () => {
    renderTable();
    expect(screen.getByTestId('duncit-table')).toBeInTheDocument();
    expect(captured.props?.tableId).toBe('challenge-portal-challenges');
    expect(captured.props?.emptyText).toMatch(/No challenges yet/);
    expect(captured.props?.defaultSort).toEqual({ field: 'created_at', dir: 'desc' });
    expect(captured.props?.searchPlaceholder).toMatch(/Search challenges/);
    expect((captured.props?.getRowId as (c: typeof row) => string)(row)).toBe('c9');
    expect(cols()).toHaveLength(7);
  });

  it('renders the name cell with and without a description', () => {
    renderTable();
    const cell = col('name').cellRenderer;
    const { rerender } = render(cell(row));
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.getByText('A short blurb')).toBeInTheDocument();

    rerender(cell({ ...row, description: null }));
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('A short blurb')).not.toBeInTheDocument();
    expect(col('name').valueGetter(row)).toBe('Sample');
  });

  it('dashes out empty category names and maps select-filter options', () => {
    renderTable();
    expect(col('super_category_id').valueGetter(row)).toBe('Sports');
    expect(col('category_id').valueGetter(row)).toBe('—');
    expect(col('super_category_id').filter.options).toEqual([{ value: 's1', label: 'Super 1' }]);
    expect(col('category_id').filter.options).toEqual([{ value: 'c1', label: 'Cat 1' }]);
    // SUB level returned no data → empty options via `?? []`.
    expect(col('sub_category_id').filter.options).toEqual([]);
    expect(col('sub_category_id').valueGetter({ ...row, sub_category_name: 'Yoga' })).toBe('Yoga');
  });

  it('adds the active-chip, date and actions columns with wired handlers', () => {
    renderTable();
    const active = cols().find((c) => c.kind === 'active');
    expect(active?.opts).toEqual({ width: 120, outlineInactive: true });
    expect(cols().some((c) => c.kind === 'date')).toBe(true);
    const actions = cols().find((c) => c.kind === 'actions');
    expect(actions?.opts.onEdit).toBe(onEdit);
    expect(actions?.opts.onDelete).toBe(onDelete);
    expect(actions?.opts.edit.ariaLabel).toBe('Edit challenge');
    expect(actions?.opts.delete.ariaLabel).toBe('Delete challenge');
  });
});
