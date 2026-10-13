import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import DeletionReviewDialog from '../../src/pages/deletion-requests/DeletionReviewDialog';
import type { DeletionDetail } from '../../src/pages/deletion-requests/queries';
import { makeDeletionDetail } from '../mocks/deletion.mock';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as unknown, refetch: vi.fn() },
  review: vi.fn(),
  reviewState: { loading: false },
  queryArgs: [] as unknown[],
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (_doc: unknown, options: unknown) => {
    m.queryArgs.push(options);
    return m.query;
  },
  useMutation: () => [m.review, m.reviewState],
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: string) => `D:${v}`, formatDateTime: (v: string) => `DT:${v}` }),
}));

const setDetail = (detail: DeletionDetail | undefined, extra: Record<string, unknown> = {}) => {
  m.query = {
    data: detail ? { catalogDeletionRequest: detail } : undefined,
    loading: false,
    error: undefined,
    refetch: vi.fn().mockResolvedValue({}),
    ...extra,
  };
};

const open = (requestId: string | null = 'del-1') => {
  const onClose = vi.fn();
  const onReviewed = vi.fn();
  render(
    <MemoryRouter>
      <DeletionReviewDialog requestId={requestId} onClose={onClose} onReviewed={onReviewed} />
    </MemoryRouter>,
  );
  return { onClose, onReviewed };
};

beforeEach(() => {
  m.review = vi.fn().mockResolvedValue({});
  m.reviewState = { loading: false };
  m.queryArgs = [];
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
  setDetail(undefined);
});

describe('DeletionReviewDialog', () => {
  it('stays closed and skips the query without a request id', () => {
    open(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(m.queryArgs[0]).toMatchObject({ skip: true, fetchPolicy: 'network-only' });
  });

  it('shows a spinner while the request loads', () => {
    setDetail(undefined, { loading: true });
    open();
    expect(screen.getByRole('progressbar', { name: 'Loading the request' })).toBeInTheDocument();
  });

  it('shows the load error when the query fails or returns nothing', () => {
    setDetail(undefined, { error: new Error('boom') });
    open();
    expect(screen.getByText('Could not load this request.')).toBeInTheDocument();
    expect(screen.queryByTestId('deletion-approve')).not.toBeInTheDocument();
  });

  it('renders a pending product request with history and the impact', () => {
    setDetail(
      makeDeletionDetail(
        { request_no: 'DEL-7', blocked_reason: 'Waiting on orders', review_note: 'Looks fine', reason: '' },
        { open_orders: 1, open_returns: 0 },
        [
          { action: 'REQUESTED', note: 'please', by: 'Asha', at: '2026-10-01' },
          { action: 'CHECKED', note: '', by: 'system', at: '2026-10-02' },
        ],
      ),
    );
    open();
    expect(screen.getByRole('dialog', { name: 'Deletion request DEL-7' })).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Waiting on orders')).toBeInTheDocument();
    expect(screen.getByText('Blue Mug', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('D:2026-11-01T00:00:00.000Z', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Looks fine', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/DT:2026-10-01 · REQUESTED · Asha — please/)).toBeInTheDocument();
    expect(screen.getByText(/DT:2026-10-02 · CHECKED · system$/)).toBeInTheDocument();
    // An empty reason falls back to the dash.
    expect(screen.getByText(/Partner.s reason:/).parentElement).toHaveTextContent('—');
    expect(screen.queryByText(/Approving cancels every running order/)).not.toBeInTheDocument();
    expect(screen.getByTestId('deletion-approve')).toBeInTheDocument();
  });

  it('hides the product row for a brand request and links refunds once decided', () => {
    setDetail(
      makeDeletionDetail({
        kind: 'BRAND',
        mode: 'CANCEL_AND_REFUND',
        status: 'APPROVED',
        request_no: 'DEL 9',
        id: 'del-9',
        cancelled_orders: 3,
        failed_refunds: 1,
      }),
    );
    open();
    expect(screen.queryByText('Product:')).not.toBeInTheDocument();
    expect(screen.getByText(/3 cancelled with a full refund · 1 refund\(s\) refused/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View these orders and their refunds' })).toHaveAttribute(
      'href',
      '/deletion-requests/refunds?request=del-9&no=DEL%209',
    );
    // Decided requests cannot be reviewed again.
    expect(screen.queryByTestId('deletion-approve')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deletion-review-note')).not.toBeInTheDocument();
  });

  it('warns about cancellations on a pending cancel-and-refund request', () => {
    setDetail(makeDeletionDetail({ mode: 'CANCEL_AND_REFUND' }));
    open();
    expect(screen.getByText(/Approving cancels every running order/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /refunds/ })).not.toBeInTheDocument();
  });

  it('cannot review a product that is part of a brand request', () => {
    setDetail(makeDeletionDetail({ parent_id: 'del-parent' }));
    open();
    expect(screen.getByText(/review the brand request instead/)).toBeInTheDocument();
    expect(screen.queryByTestId('deletion-approve')).not.toBeInTheDocument();
  });

  it('requires a note to reject and clears the error when typing', () => {
    setDetail(makeDeletionDetail());
    open();
    fireEvent.click(screen.getByTestId('deletion-reject'));
    expect(screen.getByText('Tell the partner why it is rejected.')).toBeInTheDocument();
    expect(m.review).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Note to the partner'), { target: { value: 'x' } });
    expect(screen.getByText('Optional when approving; required when rejecting.')).toBeInTheDocument();
  });

  it('rejects with the trimmed note, notifies and refreshes', async () => {
    setDetail(makeDeletionDetail());
    const { onReviewed } = open();
    fireEvent.change(screen.getByLabelText('Note to the partner'), { target: { value: '  has orders  ' } });
    fireEvent.click(screen.getByTestId('deletion-reject'));
    await waitFor(() => expect(onReviewed).toHaveBeenCalled());
    expect(m.review).toHaveBeenCalledWith({ variables: { id: 'del-1', approve: false, note: 'has orders' } });
    expect(notifySuccess).toHaveBeenCalledWith('Rejected — it is back on sale and the partner has been told.');
    expect(m.query.refetch).toHaveBeenCalled();
  });

  it('approves without a note (null) and notifies', async () => {
    setDetail(makeDeletionDetail());
    const { onReviewed } = open();
    fireEvent.click(screen.getByTestId('deletion-approve'));
    await waitFor(() => expect(onReviewed).toHaveBeenCalled());
    expect(m.review).toHaveBeenCalledWith({ variables: { id: 'del-1', approve: true, note: null } });
    expect(notifySuccess).toHaveBeenCalledWith('Approved — the partner has been told.');
  });

  it('reports the server message when the review fails', async () => {
    m.review = vi.fn().mockRejectedValue(new Error('Already decided'));
    setDetail(makeDeletionDetail());
    const { onReviewed } = open();
    fireEvent.click(screen.getByTestId('deletion-approve'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Already decided'));
    expect(onReviewed).not.toHaveBeenCalled();
  });

  it('falls back to the generic message for a non-Error failure', async () => {
    m.review = vi.fn().mockRejectedValue('nope');
    setDetail(makeDeletionDetail());
    open();
    fireEvent.click(screen.getByTestId('deletion-approve'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(vi.mocked(notifyError).mock.calls[0][0]).not.toBe('nope');
  });

  it('close calls onClose', () => {
    setDetail(makeDeletionDetail());
    const { onClose } = open();
    fireEvent.change(screen.getByLabelText('Note to the partner'), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
