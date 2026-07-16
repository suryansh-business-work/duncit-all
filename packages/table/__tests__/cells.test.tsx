import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  actionsColumn,
  activeChipColumn,
  dateColumn,
  formatDateCell,
  EM_DASH,
} from '../src/cells';

type Row = { id: string; name: string; is_active: boolean; created_at: string | null };

const activeRow: Row = { id: '1', name: 'Alpha', is_active: true, created_at: '2026-02-03T10:00:00Z' };
const inactiveRow: Row = { id: '2', name: 'Beta', is_active: false, created_at: null };

describe('formatDateCell', () => {
  it('formats with the default pattern and falls back to an em dash', () => {
    expect(formatDateCell('2026-02-03T10:00:00Z')).toBe('3 Feb 2026');
    expect(formatDateCell(null)).toBe(EM_DASH);
    expect(formatDateCell(undefined)).toBe(EM_DASH);
    expect(formatDateCell('2026-02-03T10:00:00Z', 'yyyy-MM')).toBe('2026-02');
  });
});

describe('dateColumn', () => {
  it('defaults to the hidden created_at column with a date filter', () => {
    const col = dateColumn<Row>();
    expect(col).toMatchObject({
      field: 'created_at',
      headerName: 'Created',
      hide: true,
      width: 130,
      filter: { type: 'date' },
    });
    expect(col.valueGetter?.(activeRow)).toBe('3 Feb 2026');
    expect(col.valueGetter?.(inactiveRow)).toBe(EM_DASH);
  });

  it('supports custom field/getDate/formatDate', () => {
    const col = dateColumn<Row>({
      field: 'valid_until',
      headerName: 'Valid until',
      hide: false,
      filterable: false,
      getDate: (row) => row.created_at,
      formatDate: (date) => date.getUTCFullYear().toString(),
    });
    expect(col.filter).toBeUndefined();
    expect(col.hide).toBe(false);
    expect(col.valueGetter?.(activeRow)).toBe('2026');
  });
});

describe('activeChipColumn', () => {
  it('renders Active/Inactive chips and label valueGetter', () => {
    const col = activeChipColumn<Row>();
    expect(col).toMatchObject({
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      filter: { type: 'boolean' },
    });
    expect(col.valueGetter?.(activeRow)).toBe('Active');
    expect(col.valueGetter?.(inactiveRow)).toBe('Inactive');

    const { container } = render(
      <>
        {col.cellRenderer?.(activeRow)}
        {col.cellRenderer?.(inactiveRow)}
      </>,
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(container.querySelector('.MuiChip-colorSuccess')).not.toBeNull();
  });

  it('supports custom labels, outlineInactive and getActive', () => {
    const col = activeChipColumn<Row>({
      activeLabel: 'Yes',
      inactiveLabel: 'No',
      outlineInactive: true,
      getActive: (row) => !row.is_active,
    });
    expect(col.valueGetter?.(activeRow)).toBe('No');
    const { container } = render(<>{col.cellRenderer?.(activeRow)}</>);
    expect(container.querySelector('.MuiChip-outlined')).not.toBeNull();
  });

  it('omits the boolean filter when filterable is false', () => {
    const col = activeChipColumn<Row>({ filterable: false });
    expect(col.filter).toBeUndefined();
  });
});

describe('actionsColumn', () => {
  it('renders Edit/Delete buttons wired to the row', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const col = actionsColumn<Row>({ onEdit, onDelete });
    expect(col).toMatchObject({ field: 'actions', headerName: 'Actions', width: 110, sortable: false });

    render(<>{col.cellRenderer?.(activeRow)}</>);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onEdit).toHaveBeenCalledWith(activeRow);
    expect(onDelete).toHaveBeenCalledWith(activeRow);
  });

  it('supports per-row aria labels, disabled delete with locked tooltip, and extras', () => {
    const col = actionsColumn<Row>({
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      edit: { ariaLabel: (row) => `Edit ${row.name}` },
      delete: { disabled: () => true, disabledTitle: 'System (locked)' },
      renderExtra: (row) => <span data-testid="extra">{row.id}</span>,
    });

    render(<>{col.cellRenderer?.(activeRow)}</>);
    expect(screen.getByRole('button', { name: 'Edit Alpha' })).toBeInTheDocument();
    const deleteButton = screen.getByRole('button', { name: 'System (locked)', hidden: true });
    expect(deleteButton).toBeDisabled();
    expect(screen.getByTestId('extra')).toHaveTextContent('1');
  });

  it('omits buttons whose handlers are absent', () => {
    const col = actionsColumn<Row>({ onEdit: vi.fn() });
    render(<>{col.cellRenderer?.(activeRow)}</>);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
