import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColumnFilterPopover } from '../src/header/ColumnFilterPopover';
import { TableHeaderContext, type TableHeaderState } from '../src/header/headerState';
import type { DuncitColumn, TableFilterValue } from '../src/types';

// The popover a column header opens (it replaced the toolbar's all-columns
// Filters popover): one column's filter, edited as a draft that only reaches the
// table's filters on Apply, and never touching another column's filter.
type Pod = Record<string, unknown>;

const title: DuncitColumn<Pod> = { field: 'pod_title', headerName: 'Title', type: 'text' };
const AMOUNT_FILTER: TableFilterValue = { field: 'pod_amount', op: 'gte', value: '500' };
const TITLE_FILTER: TableFilterValue = { field: 'pod_title', op: 'eq', value: 'Sunday badminton' };

function renderPopover(filters: TableFilterValue[]) {
  const setFilters = vi.fn();
  const onClose = vi.fn();
  const state: TableHeaderState = { sortBy: null, sortDir: 'asc', filters, setFilters };
  render(
    <TableHeaderContext.Provider value={state}>
      <ColumnFilterPopover<Pod> column={title} label="Title" anchorEl={document.body} onClose={onClose} />
    </TableHeaderContext.Provider>,
  );
  const dialog = within(screen.getByRole('dialog', { name: 'Filter Title' }));
  return { setFilters, onClose, dialog };
}

describe('ColumnFilterPopover', () => {
  it('opens on the filter the column already has', () => {
    const { dialog } = renderPopover([AMOUNT_FILTER, TITLE_FILTER]);
    expect(dialog.getByLabelText('Value')).toHaveValue('Sunday badminton');
    expect(dialog.getByRole('combobox', { name: /Condition/ })).toHaveTextContent('Equals');
  });

  it('applies the edited draft in place of the column’s filter, keeps every other filter, and closes', () => {
    const { dialog, setFilters, onClose } = renderPopover([AMOUNT_FILTER, TITLE_FILTER]);
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: 'Book club' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Apply' }));
    expect(setFilters).toHaveBeenCalledWith([AMOUNT_FILTER, { field: 'pod_title', op: 'eq', value: 'Book club' }]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('adds a filter to a column that had none', () => {
    const { dialog, setFilters } = renderPopover([AMOUNT_FILTER]);
    expect(dialog.getByLabelText('Value')).toHaveValue('');
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: 'Yoga' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Apply' }));
    expect(setFilters).toHaveBeenCalledWith([AMOUNT_FILTER, { field: 'pod_title', op: 'contains', value: 'Yoga' }]);
  });

  it('removes the column’s filter when Apply is pressed on a blank draft', () => {
    const { dialog, setFilters, onClose } = renderPopover([AMOUNT_FILTER, TITLE_FILTER]);
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: '' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Apply' }));
    expect(setFilters).toHaveBeenCalledWith([AMOUNT_FILTER]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Clear drops the column’s filter without applying what was typed', () => {
    const { dialog, setFilters, onClose } = renderPopover([TITLE_FILTER, AMOUNT_FILTER]);
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: 'half typed' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Clear' }));
    expect(setFilters).toHaveBeenCalledWith([AMOUNT_FILTER]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
