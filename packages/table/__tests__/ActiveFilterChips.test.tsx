import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveFilterChips } from '../src/toolbar/ActiveFilterChips';
import type { DuncitColumn, TableFilterValue } from '../src/types';

// Filters are set from each column's header; these chips are the one place all
// of the applied ones are seen together, and removed.
type Payout = Record<string, unknown>;

const columns: DuncitColumn<Payout>[] = [
  { field: 'host_name', headerName: 'Host', type: 'text' },
  { field: 'amount', headerName: 'Amount', type: 'number' },
];

const HOST: TableFilterValue = { field: 'host_name', op: 'contains', value: 'Asha' };
const AMOUNT: TableFilterValue = { field: 'amount', op: 'gte', value: '500' };

function renderChips(filters: TableFilterValue[], loading = false) {
  const setFilters = vi.fn();
  const view = render(
    <ActiveFilterChips<Payout> columns={columns} filters={filters} setFilters={setFilters} loading={loading} />,
  );
  return { ...view, setFilters };
}

describe('ActiveFilterChips', () => {
  it('renders nothing while no filter is applied', () => {
    const { container } = renderChips([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows one labelled chip per applied filter, in a group named Filters', () => {
    renderChips([HOST, AMOUNT]);
    const group = within(screen.getByRole('group', { name: 'Filters' }));
    expect(group.getByText('Host contains Asha')).toBeInTheDocument();
    expect(group.getByText('Amount ≥ 500')).toBeInTheDocument();
  });

  it('removes only the filter whose chip is deleted', () => {
    const { container, setFilters } = renderChips([HOST, AMOUNT]);
    const deleteIcons = container.querySelectorAll('.MuiChip-deleteIcon');
    expect(deleteIcons).toHaveLength(2);
    fireEvent.click(deleteIcons[1]);
    expect(setFilters).toHaveBeenCalledWith([HOST]);
  });

  it('clears every filter at once', () => {
    const { setFilters } = renderChips([HOST, AMOUNT]);
    fireEvent.click(screen.getByTestId('table-toolbar-clear-filters'));
    expect(setFilters).toHaveBeenCalledWith([]);
  });

  it('switches the chips and Clear all off while a fetch is in flight', () => {
    const { container } = renderChips([HOST], true);
    expect(container.querySelector('.MuiChip-root')).toHaveClass('Mui-disabled');
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });
});
