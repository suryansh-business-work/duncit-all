/**
 * The coupons console page: one table, one dialog, and the delete confirm.
 *
 * The table and the dialogs package are stood in for — the real grid is
 * exercised in CouponsTable.test.tsx — so what is under test here is the
 * page's own wiring: open create / open edit, the confirm-before-delete, the
 * refetch after every write, and the copy each outcome notifies with.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CouponsPage from '../src/CouponsPage';
import { CREATE_COUPON, DELETE_COUPON, UPDATE_COUPON } from '../src/queries';

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  confirm: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  refetch: vi.fn(),
  fetchRows: vi.fn(),
  attachRefetch: true,
  podsData: undefined as unknown,
  row: {
    id: 'c-1',
    code: 'SUMMER25',
    description: 'Summer sale',
    discount_pct: 25,
    scope: 'GLOBAL',
    pod_id: null,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    per_user_limit: null,
    min_order_amount: 0,
    used_count: 7,
    is_active: true,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-02T00:00:00.000Z',
  },
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: () => ({ data: h.podsData }),
    useMutation: (document: unknown) => [(options: unknown) => h.mutate(document, options)],
  };
});

vi.mock('@duncit/dialogs', () => ({
  useConfirm: () => h.confirm,
  notifySuccess: (message: string) => h.notifySuccess(message),
  notifyError: (message: string) => h.notifyError(message),
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => h.fetchRows,
  actionsColumn: (options: Record<string, unknown>) => ({
    field: 'actions',
    onEdit: options.onEdit,
    onDelete: options.onDelete,
  }),
  activeChipColumn: () => ({ field: 'is_active' }),
  dateColumn: (options?: Record<string, unknown>) => ({ field: options?.field ?? 'created_at' }),
  DuncitTable: (props: Record<string, any>) => {
    if (h.attachRefetch) props.refetchRef.current = h.refetch;
    const actions = (props.columns as Array<Record<string, any>>).find((c) => c.field === 'actions');
    return (
      <div data-testid="table">
        {props.toolbarActions}
        <button onClick={() => actions?.onEdit(h.row)}>edit-row</button>
        <button onClick={() => actions?.onDelete(h.row)}>delete-row</button>
      </div>
    );
  },
}));

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: () => <div />,
}));

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = () => render(
  <ThemeProvider theme={testTheme}>
    <CouponsPage />
  </ThemeProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  h.attachRefetch = true;
  h.podsData = { pods: [{ id: 'pod-1', pod_title: 'Sunday Badminton' }] };
  h.confirm.mockResolvedValue(true);
  h.mutate.mockResolvedValue({ data: {} });
});

describe('CouponsPage', () => {
  it('renders the console heading over the table', () => {
    mount();

    expect(screen.getByText('Coupons')).toBeInTheDocument();
    expect(screen.getByText(/Global discount codes/)).toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('renders before the pod catalogue has arrived', async () => {
    h.podsData = undefined;
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'New coupon' }));
    await settle();

    expect(screen.getByRole('dialog')).toHaveTextContent('New coupon');
  });

  it('creates a coupon from the toolbar and refetches the table', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'New coupon' }));
    await settle();

    fireEvent.change(screen.getByRole('textbox', { name: /Code/ }), { target: { value: 'monsoon15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledWith(CREATE_COUPON, {
      variables: { input: expect.objectContaining({ code: 'MONSOON15' }) },
    });
    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon created');
    expect(h.refetch).toHaveBeenCalled();
  });

  it('edits the row the table hands back, under its id', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'edit-row' }));
    await settle();
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit coupon');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledWith(UPDATE_COUPON, {
      variables: expect.objectContaining({ id: 'c-1' }),
    });
    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon updated');
    expect(h.refetch).toHaveBeenCalled();
  });

  it('asks before deleting, naming the code, and does nothing when declined', async () => {
    h.confirm.mockResolvedValue(false);
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'delete-row' }));
    await settle();

    expect(h.confirm).toHaveBeenCalledWith({
      title: 'Delete coupon',
      message: expect.stringContaining('SUMMER25'),
    });
    expect(h.mutate).not.toHaveBeenCalled();
    expect(h.notifySuccess).not.toHaveBeenCalled();
  });

  it('deletes once confirmed, then tells the admin and refetches', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'delete-row' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledWith(DELETE_COUPON, { variables: { id: 'c-1' } });
    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon deleted');
    expect(h.refetch).toHaveBeenCalled();
  });

  it('still succeeds when the table has not offered a refetch yet', async () => {
    h.attachRefetch = false;
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'delete-row' }));
    await settle();

    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon deleted');
    expect(h.refetch).not.toHaveBeenCalled();
  });

  it('surfaces the server refusal when a delete fails', async () => {
    h.mutate.mockRejectedValue(new Error('Coupon already redeemed'));
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'delete-row' }));
    await settle();

    expect(h.notifyError).toHaveBeenCalledWith('Coupon already redeemed');
  });

  it('falls back to the localized delete-failed copy when the refusal has no message', async () => {
    h.mutate.mockRejectedValue({});
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'delete-row' }));
    await settle();

    expect(h.notifyError).toHaveBeenCalledWith('Could not delete coupon');
  });

  it('closes the dialog without saving on cancel', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'New coupon' }));
    await settle();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await settle();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.mutate).not.toHaveBeenCalled();
  });
});
