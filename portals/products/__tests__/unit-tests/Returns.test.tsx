import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import ReturnDetailDialog from '../../src/pages/returns/ReturnDetailDialog';
import ReturnsPage from '../../src/pages/returns/ReturnsPage';
import { returnColumns, returnItemsText } from '../../src/pages/returns/returnColumns';
import { returnStatusKey } from '../../src/pages/returns/labels';
import { useReturnActions } from '../../src/pages/returns/useReturnActions';
import type { PodShopReturnRow } from '../../src/pages/returns/queries';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

const m = vi.hoisted(() => ({
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  loading: {} as Record<string, boolean>,
  run: vi.fn(),
  busy: false,
}));

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useMutation: (doc: { definitions: { name: { value: string } }[] }) => {
    const name = doc.definitions[0].name.value;
    return [m.mutations[name], { loading: m.loading[name] ?? false }];
  },
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (v: string) => `DT:${v}` }),
}));

const NAMES = [
  'ApprovePodShopReturn',
  'RejectPodShopReturn',
  'RetryPodShopReturnPickup',
  'MarkPodShopReturnReceived',
  'RefundPodShopReturn',
  'RetryPodShopReturnRefund',
];

const makeReturn = (over: Partial<PodShopReturnRow> = {}): PodShopReturnRow => ({
  id: 'r1',
  return_no: 'RET-1',
  order_id: 'o1',
  order_no: 'ORD-1',
  buyer_name: 'Ravi',
  buyer_email: 'ravi@example.com',
  items: [{ product_id: 'p1', variant_id: 'v1', name: 'Mug', variant_label: 'Blue', image_url: '', qty: 2, unit_cost: 100 }],
  reason: 'Damaged',
  comments: '',
  status: 'REQUESTED',
  gross: 200,
  decision_note: '',
  events: [],
  pickup: { awb: '', courier_name: '', status: '', tracking_status: '', last_error: '' },
  refund: { status: 'NONE', amount: 0, coins: 0, razorpay_refund_id: '', refunded_at: null, error: '' },
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  m.mutations = Object.fromEntries(NAMES.map((n) => [n, vi.fn().mockResolvedValue({})]));
  m.loading = {};
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('return labels and columns', () => {
  it('resolves a known status key and leaves unknown history statuses as written', () => {
    expect(returnStatusKey('REFUNDED')).toBe('products.returns.status.REFUNDED');
    expect(returnStatusKey('SOMETHING_ELSE')).toBeNull();
  });

  it('describes items with and without a variant', () => {
    expect(returnItemsText(makeReturn())).toBe('Mug (Blue) × 2');
    expect(
      returnItemsText(
        makeReturn({
          items: [
            { product_id: 'p', variant_id: 'v', name: 'Cap', variant_label: '', image_url: '', qty: 1, unit_cost: 5 },
            { product_id: 'p2', variant_id: 'v2', name: 'Pen', variant_label: 'Red', image_url: '', qty: 3, unit_cost: 5 },
          ],
        }),
      ),
    ).toBe('Cap × 1, Pen (Red) × 3');
  });

  it('builds the pickup, date and status cells', () => {
    const cols = Object.fromEntries(returnColumns((k) => k, (v) => `DT:${v}`).map((c) => [c.field, c]));
    const get = (field: string, row: PodShopReturnRow) => (cols[field].valueGetter as (r: unknown) => unknown)(row);
    expect(get('pickup', makeReturn({ pickup: { awb: 'AWB1', courier_name: 'Delhivery', status: '', tracking_status: '', last_error: '' } }))).toBe(
      'Delhivery · AWB1',
    );
    expect(get('pickup', makeReturn({ pickup: { awb: '', courier_name: '', status: '', tracking_status: '', last_error: 'No courier' } }))).toBe(
      'No courier',
    );
    expect(get('pickup', makeReturn())).toBe('—');
    expect(get('created_at', makeReturn())).toBe('DT:2026-10-01T10:00:00.000Z');
    expect(get('created_at', makeReturn({ created_at: '' }))).toBe('—');
    expect(get('gross', makeReturn())).toMatch(/200/);
    expect((cols.status as { options: unknown[] }).options).toHaveLength(7);
    const cell = (field: string) => cols[field].cellRenderer as (r: unknown) => ReactNode;
    render(
      <div>
        {cell('return_no')(makeReturn())}
        {cell('status')(makeReturn({ status: 'REFUNDED' }))}
      </div>,
    );
    expect(screen.getByText('RET-1')).toBeInTheDocument();
    expect(screen.getByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('products.returns.status.REFUNDED')).toBeInTheDocument();
  });
});

describe('useReturnActions', () => {
  it('sends the trimmed note for a decision and only the id otherwise, then notifies', async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useReturnActions(onDone));
    let ok = false;
    await act(async () => {
      ok = await result.current.run('approve', 'r1', 'fine');
    });
    expect(ok).toBe(true);
    expect(m.mutations.ApprovePodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1', note: 'fine' } });
    expect(notifySuccess).toHaveBeenCalledWith('Return approved.');
    await act(async () => {
      await result.current.run('reject', 'r1', '');
    });
    expect(m.mutations.RejectPodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1', note: null } });
    await act(async () => {
      await result.current.run('refund', 'r1', 'ignored');
    });
    expect(m.mutations.RefundPodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1' } });
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it('routes every non-decision action to its own mutation', async () => {
    const { result } = renderHook(() => useReturnActions(vi.fn()));
    await act(async () => {
      await result.current.run('retryPickup', 'r2');
      await result.current.run('received', 'r2');
      await result.current.run('retryRefund', 'r2');
    });
    expect(m.mutations.RetryPodShopReturnPickup).toHaveBeenCalledWith({ variables: { id: 'r2' } });
    expect(m.mutations.MarkPodShopReturnReceived).toHaveBeenCalledWith({ variables: { id: 'r2' } });
    expect(m.mutations.RetryPodShopReturnRefund).toHaveBeenCalledWith({ variables: { id: 'r2' } });
  });

  it('returns false and reports the server message on failure, or a generic one', async () => {
    const onDone = vi.fn();
    m.mutations.RefundPodShopReturn = vi.fn().mockRejectedValueOnce(new Error('Razorpay down')).mockRejectedValueOnce('x');
    const { result } = renderHook(() => useReturnActions(onDone));
    let ok = true;
    await act(async () => {
      ok = await result.current.run('refund', 'r1');
    });
    expect(ok).toBe(false);
    expect(notifyError).toHaveBeenCalledWith('Razorpay down');
    await act(async () => {
      await result.current.run('refund', 'r1');
    });
    expect(vi.mocked(notifyError).mock.calls[1][0]).toBe('Action failed');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('is busy while any mutation is in flight', () => {
    expect(renderHook(() => useReturnActions(vi.fn())).result.current.busy).toBe(false);
    m.loading = { RetryPodShopReturnRefund: true };
    expect(renderHook(() => useReturnActions(vi.fn())).result.current.busy).toBe(true);
  });
});

describe('ReturnDetailDialog', () => {
  const open = (row: PodShopReturnRow | null) => {
    const onClose = vi.fn();
    const onChanged = vi.fn();
    render(<ReturnDetailDialog row={row} onClose={onClose} onChanged={onChanged} />);
    return { onClose, onChanged };
  };

  it('renders nothing without a row', () => {
    open(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a requested return with its history and decision buttons only', () => {
    open(
      makeReturn({
        comments: 'Arrived cracked',
        events: [
          { status: 'REQUESTED', note: 'photo attached', by: 'Ravi', at: '2026-10-01' },
          { status: 'WEIRD', note: '', by: 'system', at: '2026-10-02' },
        ],
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Return RET-1' });
    expect(within(dialog).getByText('Arrived cracked')).toBeInTheDocument();
    expect(within(dialog).getByText('Mug (Blue) × 2')).toBeInTheDocument();
    expect(within(dialog).getByText(/DT:2026-10-01 · Requested · Ravi — photo attached/)).toBeInTheDocument();
    expect(within(dialog).getByText(/DT:2026-10-02 · WEIRD · system$/)).toBeInTheDocument();
    expect(within(dialog).queryByText('Decision note:')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Refund:')).not.toBeInTheDocument();
    for (const name of ['Approve', 'Reject']) {
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument();
    }
    for (const name of ['Retry pickup', 'Mark received', 'Refund buyer', 'Retry refund']) {
      expect(within(dialog).queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('refuses to reject without a note, then rejects with it and closes', async () => {
    m.mutations.RejectPodShopReturn = vi.fn().mockResolvedValue({});
    const { onClose, onChanged } = open(makeReturn());
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByText('Tell the buyer why the return is not accepted.')).toBeInTheDocument();
    expect(m.mutations.RejectPodShopReturn).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Note to the buyer'), { target: { value: '  Out of window ' } });
    expect(screen.getByText('Optional when approving; required when rejecting.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.mutations.RejectPodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1', note: 'Out of window' } });
    expect(onChanged).toHaveBeenCalled();
  });

  it('approves without a note', async () => {
    const { onClose } = open(makeReturn());
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.mutations.ApprovePodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1', note: null } });
  });

  it('stays open when the action fails', async () => {
    m.mutations.ApprovePodShopReturn = vi.fn().mockRejectedValue(new Error('nope'));
    const { onClose } = open(makeReturn());
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('nope'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the pickup, offers retry pickup and mark received for an approved return with a booking error', async () => {
    const { onClose } = open(
      makeReturn({
        status: 'APPROVED',
        decision_note: 'Go ahead',
        pickup: { awb: 'AWB9', courier_name: 'Delhivery', status: 'BOOKED', tracking_status: '', last_error: 'Address unserviceable' },
      }),
    );
    expect(screen.getByText(/Delhivery · AWB9 · BOOKED/)).toBeInTheDocument();
    expect(screen.getByText('ShipRocket could not book the pickup: Address unserviceable')).toBeInTheDocument();
    expect(screen.getByText('Go ahead')).toBeInTheDocument();
    expect(screen.queryByLabelText('Note to the buyer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry pickup' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.mutations.RetryPodShopReturnPickup).toHaveBeenCalledWith({ variables: { id: 'r1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark received' }));
    await waitFor(() => expect(m.mutations.MarkPodShopReturnReceived).toHaveBeenCalledWith({ variables: { id: 'r1' } }));
  });

  it('prefers the live tracking status over the booking status', () => {
    open(
      makeReturn({
        status: 'PICKUP_SCHEDULED',
        pickup: { awb: 'AWB1', courier_name: 'Bluedart', status: 'BOOKED', tracking_status: 'In transit', last_error: '' },
      }),
    );
    expect(screen.getByText(/Bluedart · AWB1 · In transit/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry pickup' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark received' })).toBeInTheDocument();
  });

  it('confirms before refunding a received return, with coins shown', async () => {
    const { onClose } = open(
      makeReturn({
        status: 'RECEIVED',
        refund: { status: 'PENDING', amount: 150, coins: 50, razorpay_refund_id: '', refunded_at: null, error: '' },
      }),
    );
    expect(screen.getByText(/PENDING · .*150.* \+ 50/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refund buyer' }));
    const confirm = await screen.findByText('Refund this return?');
    expect(m.mutations.RefundPodShopReturn).not.toHaveBeenCalled();
    const confirmDialog = confirm.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Refund buyer' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.mutations.RefundPodShopReturn).toHaveBeenCalledWith({ variables: { id: 'r1' } });
  });

  it('cancelling the refund confirmation does not refund', async () => {
    open(makeReturn({ status: 'RECEIVED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refund buyer' }));
    const confirm = await screen.findByText('Refund this return?');
    const confirmDialog = confirm.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText('Refund this return?')).not.toBeInTheDocument());
    expect(m.mutations.RefundPodShopReturn).not.toHaveBeenCalled();
  });

  it('flags a failed refund and retries it', async () => {
    const { onClose } = open(
      makeReturn({
        status: 'REFUNDED',
        refund: { status: 'FAILED', amount: 200, coins: 0, razorpay_refund_id: '', refunded_at: null, error: 'Insufficient balance' },
      }),
    );
    expect(screen.getByText('Razorpay refused the refund: Insufficient balance')).toBeInTheDocument();
    expect(screen.getByText(/FAILED · .*200/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry refund' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.mutations.RetryPodShopReturnRefund).toHaveBeenCalledWith({ variables: { id: 'r1' } });
  });

  it('shows a dash for a fact with no value', () => {
    open(makeReturn({ reason: '' }));
    expect(screen.getByText('Reason:').parentElement).toHaveTextContent('Reason: —');
  });

  it('closes from the footer button', () => {
    const { onClose } = open(makeReturn());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ReturnsPage', () => {
  it('lists returns, opens one and closes it again', async () => {
    __setTableRows([makeReturn()]);
    renderWithProviders(<ReturnsPage />);
    expect(screen.getByRole('heading', { name: 'Product returns' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('table-row'));
    const dialog = await screen.findByRole('dialog', { name: 'Return RET-1' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refreshes the table after an action succeeds', async () => {
    __setTableRows([makeReturn()]);
    renderWithProviders(<ReturnsPage />);
    fireEvent.click(await screen.findByTestId('table-row'));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(m.mutations.ApprovePodShopReturn).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
