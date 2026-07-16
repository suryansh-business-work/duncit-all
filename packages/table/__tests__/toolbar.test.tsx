import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DuncitTableToolbar } from '../src/toolbar/DuncitTableToolbar';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Row = { id: string; name: string; kind: string };

const filterableColumns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', filter: { type: 'text' } },
  { field: 'kind', headerName: 'Kind' },
];

function renderToolbar(overrides: Partial<Parameters<typeof DuncitTableToolbar<Row>>[0]> = {}) {
  const props = {
    columns: filterableColumns,
    searchInput: '',
    setSearchInput: vi.fn(),
    filters: [] as TableFilterValue[],
    setFilters: vi.fn(),
    hiddenOverrides: {},
    toggleColumn: vi.fn(),
    resetColumns: vi.fn(),
    density: 'standard' as const,
    toggleDensity: vi.fn(),
    onExportCsv: vi.fn(),
    onRefresh: vi.fn(),
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
    const { container } = render(
      <DuncitTableToolbar<Row>
        columns={filterableColumns}
        searchInput=""
        setSearchInput={vi.fn()}
        filters={filters}
        setFilters={setFilters}
        hiddenOverrides={{}}
        toggleColumn={vi.fn()}
        resetColumns={vi.fn()}
        density="standard"
        toggleDensity={vi.fn()}
        onExportCsv={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    const firstChipDelete = container.querySelector('.MuiChip-deleteIcon');
    expect(firstChipDelete).not.toBeNull();
    fireEvent.click(firstChipDelete as Element);
    expect(setFilters).toHaveBeenCalledWith([{ field: 'kind', op: 'eq', value: 'x' }]);
  });

  it('hides the Filters button when no column is filterable', () => {
    renderToolbar({ columns: [{ field: 'kind', headerName: 'Kind' }] });
    expect(screen.queryByRole('button', { name: /filters/i })).toBeNull();
  });

  it('Clear all inside the filter popover clears filters', async () => {
    const setFilters = vi.fn();
    renderToolbar({ setFilters });
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }));
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

  it('density, export, refresh and clear-search controls fire their callbacks', () => {
    const toggleDensity = vi.fn();
    const onExportCsv = vi.fn();
    const onRefresh = vi.fn();
    const setSearchInput = vi.fn();
    renderToolbar({ searchInput: 'abc', toggleDensity, onExportCsv, onRefresh, setSearchInput });
    fireEvent.click(screen.getByRole('button', { name: 'Compact density' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(toggleDensity).toHaveBeenCalledTimes(1);
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(setSearchInput).toHaveBeenCalledWith('');
  });
});
