import { fireEvent, render, screen } from '@testing-library/react';
import type { CustomHeaderProps } from 'ag-grid-react';
import { describe, expect, it, vi } from 'vitest';

// A pass-through spy: every case gets the real sort order, and the last one can
// hand the header an order that starts unsorted.
vi.mock('../src/columnTypes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/columnTypes')>();
  return { ...actual, sortingOrderOf: vi.fn(actual.sortingOrderOf) };
});

// eslint-disable-next-line import/first -- must import after the columnTypes mock is registered
import { actionsColumn } from '../src/cells';
import { sortingOrderOf } from '../src/columnTypes';
import { ColumnHeader, type ColumnHeaderParams } from '../src/header/ColumnHeader';
import { TableHeaderContext, type TableHeaderState } from '../src/header/headerState';
import type { DuncitColumn } from '../src/types';

// AG Grid mounts the header and hands it `progressSort`; the table's sort and
// filters reach it through TableHeaderContext. Both are supplied by hand here.
type Pod = { id: string };

const title: DuncitColumn<Pod> = { field: 'pod_title', headerName: 'Title', type: 'text' };
const amount: DuncitColumn<Pod> = { field: 'pod_amount', headerName: 'Amount', type: 'number' };

function renderHeader(column: DuncitColumn<Pod>, state: Partial<TableHeaderState> = {}) {
  const progressSort = vi.fn();
  const setFilters = vi.fn();
  const props = { duncitColumn: column, progressSort } as unknown as CustomHeaderProps<Pod> & ColumnHeaderParams<Pod>;
  const view = render(
    <TableHeaderContext.Provider value={{ sortBy: null, sortDir: 'asc', filters: [], setFilters, ...state }}>
      <ColumnHeader<Pod> {...props} />
    </TableHeaderContext.Provider>,
  );
  return { ...view, progressSort, setFilters };
}

describe('ColumnHeader sort', () => {
  it('sorts a text column from its label, previewing A→Z first', () => {
    const { progressSort } = renderHeader(title);
    const label = screen.getByRole('button', { name: 'Title' });
    expect(label).toHaveClass('MuiTableSortLabel-directionAsc');
    expect(label).not.toHaveClass('Mui-active');
    fireEvent.click(label);
    expect(progressSort).toHaveBeenCalledWith(false);
  });

  it('previews a number column largest first until it is sorted', () => {
    renderHeader(amount);
    expect(screen.getByRole('button', { name: 'Amount' })).toHaveClass('MuiTableSortLabel-directionDesc');
  });

  it('shows the table’s applied sort on that column only', () => {
    renderHeader(title, { sortBy: 'pod_title', sortDir: 'desc' });
    renderHeader(amount, { sortBy: 'pod_title', sortDir: 'desc' });
    const sorted = screen.getByRole('button', { name: 'Title' });
    expect(sorted).toHaveClass('Mui-active');
    expect(sorted).toHaveClass('MuiTableSortLabel-directionDesc');
    expect(screen.getByRole('button', { name: 'Amount' })).not.toHaveClass('Mui-active');
  });

  it('shows a column opted out of sorting as plain text, still filterable', () => {
    renderHeader({ ...title, sortable: false });
    expect(screen.queryByRole('button', { name: 'Title' })).not.toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByTestId('table-filter-pod_title')).toBeInTheDocument();
  });

  // Every shipped order starts with a direction, so the header's `?? 'asc'`
  // guard is only reached by an order that opens on "unsorted". Held for the
  // whole render rather than one call, so a re-render cannot slip past it.
  it('previews ascending when a sort order starts unsorted', () => {
    const created: DuncitColumn<Pod> = { field: 'created_at', headerName: 'Created', type: 'date' };
    const order = vi.mocked(sortingOrderOf);
    const real = order.getMockImplementation();
    order.mockImplementation(() => [null, 'asc', 'desc']);
    try {
      renderHeader(created);
      expect(screen.getByRole('button', { name: 'Created' })).toHaveClass('MuiTableSortLabel-directionAsc');
    } finally {
      if (real) order.mockImplementation(real);
    }
  });
});

describe('ColumnHeader filter', () => {
  it('offers neither a sort nor a filter on an actions column', () => {
    renderHeader(actionsColumn<Pod>({ headerName: 'Manage', onEdit: vi.fn() }));
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('table-filter-actions')).not.toBeInTheDocument();
  });

  it('offers no filter on a column opted out of filtering, keeping its sort', () => {
    renderHeader({ ...title, filterable: false });
    expect(screen.getByRole('button', { name: 'Title' })).toBeInTheDocument();
    expect(screen.queryByTestId('table-filter-pod_title')).not.toBeInTheDocument();
  });

  it('leaves the filter button outlined while the column has no filter', () => {
    renderHeader(title);
    const idle = screen.getByTestId('table-filter-pod_title');
    expect(idle).not.toHaveClass('MuiIconButton-colorPrimary');
    expect(idle.querySelector('[data-testid="FilterAltOutlinedIcon"]')).not.toBeNull();
  });

  it('fills and colours the filter button once the column is filtered', () => {
    renderHeader(title, { filters: [{ field: 'pod_title', op: 'contains', value: 'Yoga' }] });
    const active = screen.getByTestId('table-filter-pod_title');
    expect(active).toHaveClass('MuiIconButton-colorPrimary');
    expect(active.querySelector('[data-testid="FilterAltIcon"]')).not.toBeNull();
  });

  it('opens the column’s filter popover, and closes it once the filter is applied', () => {
    const { setFilters } = renderHeader(title);
    const button = screen.getByTestId('table-filter-pod_title');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Filter Title' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'Yoga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setFilters).toHaveBeenCalledWith([{ field: 'pod_title', op: 'contains', value: 'Yoga' }]);
    expect(screen.queryByRole('dialog', { name: 'Filter Title' })).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
