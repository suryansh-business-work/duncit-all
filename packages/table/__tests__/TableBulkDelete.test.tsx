import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmProvider } from '@duncit/dialogs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableBulkDelete, type TableBulkDeleteProps } from '../src/bulk/TableBulkDelete';
import type { BulkDeleteBinding } from '../src/bulk/useBulkDelete';
import type { TableQueryState } from '../src/types';

const QUERY: TableQueryState = {
  search: 'yoga',
  page: 1,
  pageSize: 25,
  sortBy: null,
  sortDir: 'asc',
  filters: [{ field: 'status', op: 'eq', value: 'DRAFT' }],
};
const VARIABLES = { query: { search: 'yoga', page: 1, page_size: 25 } };

function makeBinding(started: boolean) {
  const start = vi.fn(async () => started);
  const variablesOf = vi.fn(() => VARIABLES);
  const binding: BulkDeleteBinding = {
    api: { tables: new Set(['couponsTable']), start, onSettled: vi.fn(() => () => undefined) },
    table: 'couponsTable',
    variablesOf,
  };
  return { binding, start, variablesOf };
}

function renderBulk(binding: BulkDeleteBinding, overrides: Partial<TableBulkDeleteProps> = {}) {
  const onStarted = vi.fn();
  render(
    <ConfirmProvider>
      <TableBulkDelete
        binding={binding}
        query={QUERY}
        total={42}
        selectedIds={[]}
        loading={false}
        onStarted={onStarted}
        {...overrides}
      />
    </ConfirmProvider>,
  );
  return onStarted;
}

const deleteAllButton = () => screen.getByTestId('table-bulk-delete-all');

beforeEach(() => {
  document.title = 'Coupons · Duncit Finance';
});

afterEach(() => {
  document.title = '';
});

describe('TableBulkDelete', () => {
  it('offers only "delete all matching" while nothing is ticked', () => {
    const { binding } = makeBinding(true);
    renderBulk(binding);
    expect(screen.queryByTestId('table-bulk-delete-selected')).not.toBeInTheDocument();
    expect(deleteAllButton()).toHaveAccessibleName('Delete all matching rows');
    expect(deleteAllButton()).toBeEnabled();
  });

  it('switches both controls off while the grid loads', () => {
    const { binding } = makeBinding(true);
    renderBulk(binding, { loading: true, selectedIds: ['DUN-CPN-101'] });
    expect(screen.getByTestId('table-bulk-delete-selected')).toBeDisabled();
    expect(deleteAllButton()).toBeDisabled();
  });

  it('has nothing to delete when the server matched no rows', () => {
    const { binding } = makeBinding(true);
    renderBulk(binding, { total: 0 });
    expect(deleteAllButton()).toBeDisabled();
  });

  it('confirms the ticked count, hands the ticked ids to the server and clears the ticks', async () => {
    const { binding, start, variablesOf } = makeBinding(true);
    const onStarted = renderBulk(binding, {
      selectedIds: ['DUN-CPN-101', 'DUN-CPN-102'],
      label: 'Coupons',
    });

    fireEvent.click(screen.getByTestId('table-bulk-delete-selected'));
    expect(screen.getByTestId('table-bulk-delete-selected')).toHaveTextContent('Delete 2 selected');
    expect(await screen.findByText('Delete 2 rows?')).toBeInTheDocument();
    expect(screen.getByText(/The 2 selected rows will be deleted on the server/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
    expect(variablesOf).toHaveBeenCalledWith(QUERY);
    expect(start).toHaveBeenCalledWith({
      table: 'couponsTable',
      mode: 'SELECTED',
      variables: VARIABLES,
      ids: ['DUN-CPN-101', 'DUN-CPN-102'],
      label: 'Coupons',
      url: globalThis.location.href,
    });
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const { binding, start } = makeBinding(true);
    const onStarted = renderBulk(binding, { selectedIds: ['DUN-CPN-101'] });

    fireEvent.click(screen.getByTestId('table-bulk-delete-selected'));
    expect(await screen.findByText('Delete 1 row?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByText('Delete 1 row?')).not.toBeInTheDocument());
    expect(start).not.toHaveBeenCalled();
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('sends every matching row with no ids, named after the page, and keeps the ticks when the server refuses', async () => {
    const { binding, start } = makeBinding(false);
    const onStarted = renderBulk(binding, { selectedIds: ['DUN-CPN-101'] });

    fireEvent.click(deleteAllButton());
    expect(await screen.findByText('Delete all 42 matching rows?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ALL', ids: [], label: 'Coupons · Duncit Finance' }),
    );
    expect(onStarted).not.toHaveBeenCalled();
  });
});
