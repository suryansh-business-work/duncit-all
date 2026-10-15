import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PodHistoryDetailsPage from '../PodHistoryDetailsPage';

/*
  Under test: the page's states (loading, error, missing record), the
  variables each action sends to the server, the toast it raises on success
  and on refusal, and that every action re-reads BOTH the memberships and the
  attempt counters. Apollo is spied per document; the details body and the
  three confirm dialogs have their own suites and are stubs that expose the
  props this page hands them.
*/
interface MembershipsAnswer {
  data?: unknown;
  loading?: boolean;
  error?: unknown;
}
interface StateOptions {
  variables: { pod_doc_id: string };
  skip: boolean;
}
const h = vi.hoisted(() => {
  const memberships: MembershipsAnswer = {};
  const state: unknown = undefined;
  const stateOptions: StateOptions[] = [];
  return {
    memberships,
    state,
    stateOptions,
    refetch: vi.fn<() => Promise<unknown>>(),
    refetchState: vi.fn<() => Promise<unknown>>(),
    backout: vi.fn<(opts: unknown) => Promise<unknown>>(),
    rejoin: vi.fn<(opts: unknown) => Promise<unknown>>(),
    cancelSpot: vi.fn<(opts: unknown) => Promise<unknown>>(),
    notify: vi.fn<(message: string, severity: string) => void>(),
  };
});

vi.mock('@apollo/client/react', async (importOriginal) => {
  const q = await import('../queries');
  return {
    ...(await importOriginal<typeof import('@apollo/client/react')>()),
    useQuery: (query: unknown, options: StateOptions) => {
      if (query === q.MY_POD_MEMBERSHIPS) return { ...h.memberships, refetch: h.refetch };
      h.stateOptions.push(options);
      return { data: h.state, refetch: h.refetchState };
    },
    useMutation: (doc: unknown) => {
      if (doc === q.BACKOUT_POD_HISTORY) return [h.backout, { loading: false }];
      if (doc === q.REJOIN_POD) return [h.rejoin, { loading: false }];
      return [h.cancelSpot, { loading: true }];
    },
  };
});

vi.mock('../../../components/notify', () => ({ notify: h.notify }));

vi.mock('../PodHistoryDetails', () => ({
  default: (p: {
    item: { id: string };
    backoutMaxed: boolean;
    cancelSpotMaxed: boolean;
    cancellingSpot: boolean;
    onBackout: () => void;
    onRejoin: () => void;
    onCancelSpot: () => void;
  }) => (
    <div
      data-testid="details-stub"
      data-item={p.item.id}
      data-backout-maxed={String(p.backoutMaxed)}
      data-cancel-maxed={String(p.cancelSpotMaxed)}
      data-cancelling={String(p.cancellingSpot)}
    >
      <button type="button" onClick={p.onBackout}>open-backout</button>
      <button type="button" onClick={p.onRejoin}>open-rejoin</button>
      <button type="button" onClick={p.onCancelSpot}>open-cancel</button>
    </div>
  ),
}));

vi.mock('../../pod-details-page/BackoutConfirmDialog', () => ({
  default: (p: { open: boolean; mySeats: number; onClose: () => void; onConfirm: (seats: number) => void }) =>
    p.open ? (
      <div data-testid="backout-dialog" data-seats={p.mySeats}>
        <button type="button" onClick={() => p.onConfirm(2)}>confirm-backout</button>
        <button type="button" onClick={p.onClose}>close-backout</button>
      </div>
    ) : null,
}));

vi.mock('../../pod-details-page/CancelSpotDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    p.open ? (
      <div data-testid="cancel-dialog">
        <button type="button" onClick={p.onConfirm}>confirm-cancel</button>
        <button type="button" onClick={p.onClose}>close-cancel</button>
      </div>
    ) : null,
}));

vi.mock('../RejoinConfirmDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    p.open ? (
      <div data-testid="rejoin-dialog">
        <button type="button" onClick={p.onConfirm}>confirm-rejoin</button>
        <button type="button" onClick={p.onClose}>close-rejoin</button>
      </div>
    ) : null,
}));

const MEMBERSHIP = { id: 'm1', seats: 3, pod: { id: 'pod-doc-1', pod_title: 'Sunday Hike' } };

const renderPage = (membershipId = 'm1') =>
  render(
    <MemoryRouter initialEntries={[`/pod-history/${membershipId}`]}>
      <Routes>
        <Route path="/pod-history/:membershipId" element={<PodHistoryDetailsPage />} />
        <Route path="/pod-history" element={<div data-testid="history-list-route" />} />
      </Routes>
    </MemoryRouter>,
  );

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  h.memberships = { loading: false, data: { myPodMemberships: [MEMBERSHIP] } };
  h.state = { podMembershipState: { backout_attempts_used: 1, backout_attempts_max: 2, spot_cancels_used: 0, spot_cancels_max: 1 } };
  h.stateOptions = [];
  h.refetch.mockResolvedValue({});
  h.refetchState.mockResolvedValue({});
  h.backout.mockResolvedValue({});
  h.rejoin.mockResolvedValue({});
  h.cancelSpot.mockResolvedValue({});
});

describe('PodHistoryDetailsPage — states', () => {
  it('shows a labelled spinner while the first read is in flight', () => {
    h.memberships = { loading: true };
    renderPage();
    expect(screen.getByTestId('pod-history-details-loading')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Loading…');
  });

  it('shows the API error when the read fails', () => {
    h.memberships = { loading: false, error: { message: 'Server said no' } };
    renderPage();
    expect(screen.getByTestId('pod-history-details-error')).toHaveTextContent('Server said no');
  });

  it('says the record is missing when the id is not among the memberships, and skips the state read', () => {
    renderPage('m-unknown');
    expect(screen.getByTestId('pod-history-details-missing')).toHaveTextContent('Pod history record not found.');
    expect(h.stateOptions.at(-1)).toEqual(expect.objectContaining({ skip: true, variables: { pod_doc_id: '' } }));
  });

  it('titles the page with the pod, passes the attempt state down and goes back to the list', () => {
    renderPage();
    expect(screen.getByTestId('pod-history-details-title')).toHaveTextContent('Sunday Hike');
    expect(h.stateOptions.at(-1)).toEqual(expect.objectContaining({ skip: false, variables: { pod_doc_id: 'pod-doc-1' } }));
    const details = screen.getByTestId('details-stub');
    expect(details).toHaveAttribute('data-item', 'm1');
    expect(details).toHaveAttribute('data-backout-maxed', 'false');
    expect(details).toHaveAttribute('data-cancel-maxed', 'false');
    expect(details).toHaveAttribute('data-cancelling', 'true');

    click('Back to pod history');
    expect(screen.getByTestId('history-list-route')).toBeInTheDocument();
  });

  it('marks backout and cancel as used up once the server says so', () => {
    h.state = { podMembershipState: { backout_attempts_used: 2, backout_attempts_max: 2, spot_cancels_used: 1, spot_cancels_max: 1 } };
    renderPage();
    expect(screen.getByTestId('details-stub')).toHaveAttribute('data-backout-maxed', 'true');
    expect(screen.getByTestId('details-stub')).toHaveAttribute('data-cancel-maxed', 'true');
  });
});

describe('PodHistoryDetailsPage — backout', () => {
  it('sends the chosen seats, confirms, closes the dialog and re-reads both queries', async () => {
    renderPage();
    click('open-backout');
    expect(screen.getByTestId('backout-dialog')).toHaveAttribute('data-seats', '3');
    click('confirm-backout');

    await waitFor(() => expect(h.refetchState).toHaveBeenCalledTimes(1));
    expect(h.backout).toHaveBeenCalledWith({ variables: { pod_doc_id: 'pod-doc-1', seats: 2 } });
    expect(h.notify).toHaveBeenCalledWith('Backout request recorded', 'success');
    expect(h.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('backout-dialog')).not.toBeInTheDocument();
  });

  it('shows the refusal, keeps the dialog open and still re-reads', async () => {
    h.backout.mockRejectedValue({ graphQLErrors: [{ message: 'No backout attempts left' }] });
    h.refetch.mockRejectedValue(new Error('offline'));
    renderPage();
    click('open-backout');
    click('confirm-backout');

    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('No backout attempts left', 'error'));
    await waitFor(() => expect(h.refetchState).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('backout-dialog')).toBeInTheDocument();
  });

  it('closes without sending anything', () => {
    renderPage();
    click('open-backout');
    click('close-backout');
    expect(screen.queryByTestId('backout-dialog')).not.toBeInTheDocument();
    expect(h.backout).not.toHaveBeenCalled();
  });
});

describe('PodHistoryDetailsPage — cancel spot', () => {
  it('cancels the spot, confirms and re-reads', async () => {
    renderPage();
    click('open-cancel');
    click('confirm-cancel');

    await waitFor(() => expect(h.refetchState).toHaveBeenCalledTimes(1));
    expect(h.cancelSpot).toHaveBeenCalledWith({ variables: { pod_doc_id: 'pod-doc-1' } });
    expect(h.notify).toHaveBeenCalledWith(
      'Your spot is cancelled. You can join again any time while the pod is open.',
      'success',
    );
    expect(screen.queryByTestId('cancel-dialog')).not.toBeInTheDocument();
  });

  it('names a refusal by its error code', async () => {
    h.cancelSpot.mockRejectedValue({ graphQLErrors: [{ message: 'x', extensions: { code: 'ALREADY_CHECKED_IN' } }] });
    renderPage();
    click('open-cancel');
    click('confirm-cancel');

    await waitFor(() =>
      expect(h.notify).toHaveBeenCalledWith(
        'You have already been checked in at this pod, so your spot can no longer be cancelled.',
        'error',
      ),
    );
    expect(screen.queryByTestId('cancel-dialog')).not.toBeInTheDocument();
  });

  it('falls back to the generic sentence when the refusal carries no code', async () => {
    h.cancelSpot.mockRejectedValue(new Error('Failed to fetch'));
    renderPage();
    click('open-cancel');
    click('confirm-cancel');

    await waitFor(() =>
      expect(h.notify).toHaveBeenCalledWith('We could not cancel your spot. Please try again.', 'error'),
    );
  });

  it('closes without sending anything', () => {
    renderPage();
    click('open-cancel');
    click('close-cancel');
    expect(screen.queryByTestId('cancel-dialog')).not.toBeInTheDocument();
    expect(h.cancelSpot).not.toHaveBeenCalled();
  });
});

describe('PodHistoryDetailsPage — rejoin', () => {
  it('rejoins, confirms, closes and re-reads', async () => {
    renderPage();
    click('open-rejoin');
    click('confirm-rejoin');

    await waitFor(() => expect(h.refetchState).toHaveBeenCalledTimes(1));
    expect(h.rejoin).toHaveBeenCalledWith({ variables: { pod_doc_id: 'pod-doc-1' } });
    expect(h.notify).toHaveBeenCalledWith('Rejoined pod successfully', 'success');
    expect(screen.queryByTestId('rejoin-dialog')).not.toBeInTheDocument();
  });

  it('shows the refusal and keeps the dialog open without re-reading', async () => {
    h.rejoin.mockRejectedValue({ graphQLErrors: [{ message: 'Pod is full' }] });
    renderPage();
    click('open-rejoin');
    click('confirm-rejoin');

    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Pod is full', 'error'));
    expect(h.refetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('rejoin-dialog')).toBeInTheDocument();
    click('close-rejoin');
    expect(screen.queryByTestId('rejoin-dialog')).not.toBeInTheDocument();
  });
});

describe('PodHistoryDetailsPage — a record whose pod is gone', () => {
  it('falls back to the generic title and sends nothing for any action', async () => {
    h.memberships = { loading: false, data: { myPodMemberships: [{ id: 'm1', seats: null, pod: null }] } };
    renderPage();
    expect(screen.getByTestId('pod-history-details-title')).toHaveTextContent('Pod details');

    click('open-backout');
    expect(screen.getByTestId('backout-dialog')).toHaveAttribute('data-seats', '1');
    click('confirm-backout');
    click('open-cancel');
    click('confirm-cancel');
    click('open-rejoin');
    click('confirm-rejoin');

    await waitFor(() => expect(screen.getByTestId('rejoin-dialog')).toBeInTheDocument());
    expect(h.backout).not.toHaveBeenCalled();
    expect(h.cancelSpot).not.toHaveBeenCalled();
    expect(h.rejoin).not.toHaveBeenCalled();
    expect(h.notify).not.toHaveBeenCalled();
    expect(h.refetch).not.toHaveBeenCalled();
  });
});
