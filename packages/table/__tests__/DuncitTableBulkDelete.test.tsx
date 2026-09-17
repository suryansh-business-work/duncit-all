import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmProvider } from '@duncit/dialogs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableBulkDeleteApi } from '../src/bulk/bulkDeleteContext';
import type { DuncitColumn } from '../src/types';

// The GET API dialog reads the caller's table-API access over Apollo; this suite
// is about the bulk delete beside it, so the dialog stays out of the way.
vi.mock('../src/tableApi/TableApiDialog', () => ({ TableApiDialog: () => null }));

const { DuncitTable } = await import('../src/DuncitTable');
const { makeApolloTableFetch } = await import('../src/apolloFetch');
const { TableBulkDeleteProvider } = await import('../src/bulk/bulkDeleteContext');

type Coupon = { id: string; code: string };

const COUPONS: Coupon[] = [
  { id: 'DUN-CPN-101', code: 'MONSOON200' },
  { id: 'DUN-CPN-102', code: 'YOGA150' },
  { id: 'DUN-CPN-103', code: 'PAWS99' },
];

const columns: DuncitColumn<Coupon>[] = [{ field: 'code', headerName: 'Code', type: 'text' }];

function setup(started: boolean) {
  const client = {
    query: vi.fn(async () => ({ data: { couponsTable: { rows: COUPONS, total: COUPONS.length } } })),
  };
  const fetchRows = makeApolloTableFetch<Coupon>(client, { kind: 'Document' }, 'couponsTable');
  const listeners: Array<() => void> = [];
  const api: TableBulkDeleteApi = {
    tables: new Set(['couponsTable']),
    start: vi.fn(async () => started),
    onSettled: vi.fn((_table: string, listener: () => void) => {
      listeners.push(listener);
      return () => undefined;
    }),
  };
  render(
    <ConfirmProvider>
      <TableBulkDeleteProvider value={api}>
        <DuncitTable<Coupon>
          tableId="coupons-bulk"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={(row) => row.id}
          ariaLabel="Coupons"
        />
      </TableBulkDeleteProvider>
    </ConfirmProvider>,
  );
  return { api, client, listeners };
}

const rowCheckboxes = () => screen.getAllByRole('checkbox', { name: 'Select row' });

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('DuncitTable bulk delete', () => {
  it('gives a registered table its own checkbox column and deletes the ticked rows', async () => {
    const { api } = setup(true);
    await screen.findByText('MONSOON200');
    expect(screen.getByTestId('table-bulk-delete-all')).toBeEnabled();

    fireEvent.click(rowCheckboxes()[0]);
    fireEvent.click(rowCheckboxes()[1]);
    const selectedButton = await screen.findByTestId('table-bulk-delete-selected');
    await waitFor(() => expect(selectedButton).toHaveTextContent('Delete 2 selected'));

    fireEvent.click(selectedButton);
    expect(await screen.findByText('Delete 2 rows?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(1));
    expect(api.start).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'couponsTable',
        mode: 'SELECTED',
        ids: ['DUN-CPN-101', 'DUN-CPN-102'],
        label: 'Coupons',
        variables: { query: expect.objectContaining({ page: 1, page_size: 25 }) },
      }),
    );

    // Once the server has the job the ticks go, and the button with them. The
    // dialog keeps the page aria-hidden until its exit has finished, so the
    // boxes are read once they are back in the accessibility tree.
    await waitFor(() => expect(screen.queryByTestId('table-bulk-delete-selected')).not.toBeInTheDocument());
    await waitFor(() => {
      const boxes = rowCheckboxes();
      expect(boxes).toHaveLength(COUPONS.length);
      expect(boxes.filter((box) => (box as HTMLInputElement).checked)).toHaveLength(0);
    });
  });

  it('refetches its rows when a job on its table settles', async () => {
    const { api, client, listeners } = setup(true);
    await screen.findByText('MONSOON200');
    expect(api.onSettled).toHaveBeenCalledWith('couponsTable', expect.any(Function));
    const callsBefore = client.query.mock.calls.length;

    listeners.at(-1)?.();
    await waitFor(() => expect(client.query.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
