import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DuncitTableToolbar } from '../src/toolbar/DuncitTableToolbar';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Row = { id: string; name: string; kind: string };

const columns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', type: 'text' },
  { field: 'kind', headerName: 'Kind', type: 'text' },
];

function renderToolbar(overrides: Partial<Parameters<typeof DuncitTableToolbar<Row>>[0]> = {}) {
  const props = {
    columns,
    searchInput: '',
    setSearchInput: vi.fn(),
    filters: [] as TableFilterValue[],
    setFilters: vi.fn(),
    hiddenOverrides: {},
    toggleColumn: vi.fn(),
    resetColumns: vi.fn(),
    density: 'standard' as const,
    toggleDensity: vi.fn(),
    dataActions: <button type="button">Data actions</button>,
    onRefresh: vi.fn(),
    loading: false,
    ...overrides,
  };
  render(<DuncitTableToolbar<Row> {...props} />);
  return props;
}

describe('DuncitTableToolbar', () => {
  it('deleting a filter chip removes only that filter', () => {
    const setFilters = vi.fn();
    const filters: TableFilterValue[] = [
      { field: 'name', op: 'contains', value: 'ab' },
      { field: 'kind', op: 'eq', value: 'x' },
    ];
    renderToolbar({ filters, setFilters });
    const chips = screen.getByRole('group', { name: 'Filters' });
    const firstChipDelete = chips.querySelector('.MuiChip-deleteIcon');
    expect(firstChipDelete).not.toBeNull();
    fireEvent.click(firstChipDelete as Element);
    expect(setFilters).toHaveBeenCalledWith([{ field: 'kind', op: 'eq', value: 'x' }]);
  });

  it('has no Filters button: filters are set from the column headers, and chipped only once applied', () => {
    renderToolbar();
    expect(screen.queryByRole('button', { name: /filters/i })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Filters' })).toBeNull();
  });

  it('Clear all beside the chips clears every filter', () => {
    const setFilters = vi.fn();
    renderToolbar({ setFilters, filters: [{ field: 'name', op: 'contains', value: 'ab' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(setFilters).toHaveBeenCalledWith([]);
  });

  it('Reset columns in the column menu clears overrides', async () => {
    const resetColumns = vi.fn();
    renderToolbar({ resetColumns });
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reset columns' }));
    expect(resetColumns).toHaveBeenCalledTimes(1);
  });

  it('toggling a column in the menu reports its field and current hidden state', async () => {
    const toggleColumn = vi.fn();
    renderToolbar({ toggleColumn });
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Name' }));
    expect(toggleColumn).toHaveBeenCalledWith('name', false);
  });

  it('shows the Standard-density affordance while compact', () => {
    renderToolbar({ density: 'compact' });
    expect(screen.getByRole('button', { name: 'Standard density' })).toBeInTheDocument();
  });

  it('density, refresh and clear-search controls fire their callbacks, beside the data actions slot', () => {
    const toggleDensity = vi.fn();
    const onRefresh = vi.fn();
    const setSearchInput = vi.fn();
    renderToolbar({ searchInput: 'abc', toggleDensity, onRefresh, setSearchInput });
    expect(screen.getByRole('button', { name: 'Data actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compact density' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(toggleDensity).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(setSearchInput).toHaveBeenCalledWith('');
  });

  it('the search input carries the table-toolbar-search test id and types into setSearchInput', () => {
    const setSearchInput = vi.fn();
    renderToolbar({ setSearchInput, searchPlaceholder: 'Search subject' });
    const search = screen.getByTestId('table-toolbar-search');
    expect(search).toHaveAttribute('aria-label', 'Search subject');
    fireEvent.change(search, { target: { value: 'DUN-TKT' } });
    expect(setSearchInput).toHaveBeenCalledWith('DUN-TKT');
  });
});
