import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { rowMenuColumn } from '../src/cells';
import { isColumnFilterable, isColumnSortable } from '../src/columnTypes';

type Row = { id: string; name: string; live: boolean };
const yonex: Row = { id: 'BRD-000014', name: 'Yonex', live: true };

describe('rowMenuColumn', () => {
  it('is a narrow actions column, never sorted or filtered', () => {
    const col = rowMenuColumn<Row>({ items: () => [] });
    expect(col).toMatchObject({ field: 'menu', headerKey: 'shell.common.actions', width: 64, type: 'actions' });
    expect(isColumnSortable(col)).toBe(false);
    expect(isColumnFilterable(col)).toBe(false);
    expect(rowMenuColumn<Row>({ items: () => [], headerName: 'More', field: 'more', width: 80 })).toMatchObject({
      field: 'more',
      headerName: 'More',
      headerKey: undefined,
      width: 80,
    });
  });

  it('opens the row menu and runs the chosen item, then closes', async () => {
    const view = vi.fn();
    const pause = vi.fn();
    const col = rowMenuColumn<Row>({
      ariaLabel: (row) => `Options for ${row.name}`,
      items: (row) => [
        { key: 'view', label: 'View details', onClick: () => view(row.id) },
        { key: 'pause', label: 'Pause', onClick: pause, destructive: true, icon: <span data-testid="pause-icon" /> },
      ],
    });
    render(<>{col.cellRenderer?.(yonex)}</>);
    const button = screen.getByRole('button', { name: 'Options for Yonex' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'View details' }));
    expect(view).toHaveBeenCalledWith('BRD-000014');
    expect(pause).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps a disabled item from running, and falls back to the shared Actions label', async () => {
    const remove = vi.fn();
    const col = rowMenuColumn<Row>({
      items: () => [{ key: 'delete', label: 'Delete', onClick: remove, disabled: true }],
    });
    render(<>{col.cellRenderer?.(yonex)}</>);
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders no button for a row with nothing to do', () => {
    const col = rowMenuColumn<Row>({ items: () => [] });
    render(<>{col.cellRenderer?.(yonex)}</>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
