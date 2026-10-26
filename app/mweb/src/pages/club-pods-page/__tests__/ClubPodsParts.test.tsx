import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import ClubPodActions from '../ClubPodActions';
import ClubPodRow from '../ClubPodRow';
import ClubPodsFilters from '../ClubPodsFilters';
import CreatePodLauncher from '../CreatePodLauncher';
import ClubPodActivityDialog from '../ClubPodActivityDialog';
import { useDeletePod } from '../useDeletePod';
import type { ClubAdminPodRow } from '../types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  flag: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useMutation: h.useMutation,
}));
vi.mock('../../../hooks/useFeatureFlag', () => ({ useFeatureFlag: h.flag }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹' }) }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string | null) => `at:${d}` }),
}));

const pod = (over: Partial<ClubAdminPodRow> = {}): ClubAdminPodRow => ({
  id: 'p1',
  pod_title: 'Sunday Run',
  pod_date_time: '2026-07-01T06:00:00.000Z',
  pod_attendees: ['a', 'b'],
  no_of_spots: 10,
  place_label: 'Cubbon Park',
  pod_type: 'PAID',
  pod_amount: 250,
  attendance: { attended_seats: 3, booked_seats: 4, recorded: true },
  is_active: true,
  completed_at: null,
  is_deleted: false,
  venue_approval_status: null,
  ...over,
});

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const inRouter = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClubPodActions', () => {
  const actions = (p: ClubAdminPodRow) => {
    const handlers = { onActivity: vi.fn(), onRequestChange: vi.fn(), onDelete: vi.fn() };
    inRouter(<ClubPodActions pod={p} podsPath="/clubs/c1/pods" {...handlers} />);
    return handlers;
  };

  it('offers details, edit and activity, plus attendance for a running pod, change and delete', () => {
    const handlers = actions(pod());
    expect(screen.getByTestId('club-pod-actions-details-p1')).toHaveAttribute('href', '/clubs/c1/pods/p1');
    expect(screen.getByTestId('club-pod-actions-attendance-p1')).toHaveAttribute('href', '/host/pod/p1/attendance');
    expect(screen.getByTestId('club-pod-actions-edit-p1')).toHaveAttribute('href', '/clubs/c1/pods/p1/edit');
    fireEvent.click(screen.getByTestId('club-pod-actions-activity-p1'));
    fireEvent.click(screen.getByTestId('club-pod-actions-change-p1'));
    fireEvent.click(screen.getByTestId('club-pod-actions-delete-p1'));
    expect(handlers.onActivity).toHaveBeenCalledTimes(1);
    expect(handlers.onRequestChange).toHaveBeenCalledTimes(1);
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides attendance for a draft pod', () => {
    actions(pod({ is_active: false }));
    expect(screen.queryByTestId('club-pod-actions-attendance-p1')).not.toBeInTheDocument();
    expect(screen.getByTestId('club-pod-actions-edit-p1')).toBeInTheDocument();
  });

  it('keeps a cancelled pod editable but offers no change request or delete', () => {
    actions(pod({ is_deleted: true }));
    expect(screen.getByTestId('club-pod-actions-edit-p1')).toBeInTheDocument();
    expect(screen.getByTestId('club-pod-actions-activity-p1')).toBeInTheDocument();
    expect(screen.queryByTestId('club-pod-actions-change-p1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-pod-actions-delete-p1')).not.toBeInTheDocument();
  });
});

describe('ClubPodRow', () => {
  const row = (p: ClubAdminPodRow) => {
    const handlers = { onActivity: vi.fn(), onRequestChange: vi.fn(), onDelete: vi.fn() };
    inRouter(<ClubPodRow pod={p} podsPath="/clubs/c1/pods" {...handlers} />);
    return handlers;
  };

  it('shows title, status, time, place, counts, attendance and price', () => {
    row(pod());
    const el = screen.getByTestId('club-pod-row-p1');
    expect(el).toHaveTextContent('Sunday Run');
    expect(el).toHaveTextContent('at:2026-07-01T06:00:00.000Z');
    expect(el).toHaveTextContent('Cubbon Park');
    expect(el).toHaveTextContent('3 / 4');
    expect(el).toHaveTextContent('250');
    expect(screen.getByTestId('club-pod-row-p1-status')).toBeInTheDocument();
    expect(screen.getAllByTestId('fact-line')).toHaveLength(4);
  });

  it('says nobody scanned instead of a confident zero, and shows Free with no place', () => {
    row(pod({ attendance: { attended_seats: 0, booked_seats: 4, recorded: false }, pod_type: 'FREE', place_label: null }));
    const el = screen.getByTestId('club-pod-row-p1');
    expect(el).toHaveTextContent(fallbackT('mweb.studioPods.attendedNone'));
    expect(el).toHaveTextContent(fallbackT('mweb.podDetails.free'));
    expect(el).not.toHaveTextContent('Cubbon Park');
  });

  it('passes its own pod to the action handlers', () => {
    const p = pod();
    const handlers = row(p);
    fireEvent.click(screen.getByTestId('club-pod-actions-activity-p1'));
    fireEvent.click(screen.getByTestId('club-pod-actions-change-p1'));
    fireEvent.click(screen.getByTestId('club-pod-actions-delete-p1'));
    expect(handlers.onActivity).toHaveBeenCalledWith(p);
    expect(handlers.onRequestChange).toHaveBeenCalledWith(p);
    expect(handlers.onDelete).toHaveBeenCalledWith(p);
  });
});

describe('ClubPodsFilters', () => {
  it('reports search text and the picked status filter', () => {
    const onSearch = vi.fn();
    const onStatus = vi.fn();
    render(<ClubPodsFilters search="run" onSearch={onSearch} status="" onStatus={onStatus} />);
    expect(screen.getByTestId('club-pods-filters')).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: fallbackT('mweb.common.search') });
    expect(input).toHaveValue('run');
    fireEvent.change(input, { target: { value: 'yoga' } });
    expect(onSearch).toHaveBeenCalledWith('yoga');
    fireEvent.click(screen.getByTestId('pill-chips-CANCELLED'));
    expect(onStatus).toHaveBeenCalledWith('CANCELLED');
  });
});

describe('CreatePodLauncher', () => {
  const launcher = () => inRouter(<CreatePodLauncher clubId="c1" normalTo="/clubs/c1/pods/new" />);

  it('opens the ordinary editor straight away when auto pods are off', () => {
    h.flag.mockReturnValue(false);
    launcher();
    fireEvent.click(screen.getByTestId('club-pods-page-new'));
    expect(screen.getByTestId('where')).toHaveTextContent('/clubs/c1/pods/new');
  });

  it('asks which kind when auto pods are on, and routes each answer', async () => {
    h.flag.mockReturnValue(true);
    const { unmount } = launcher();
    fireEvent.click(screen.getByTestId('club-pods-page-new'));
    fireEvent.click(await screen.findByTestId('pod-kind-auto'));
    expect(screen.getByTestId('where')).toHaveTextContent('/clubs/c1/auto-pods/new');
    unmount();

    launcher();
    fireEvent.click(screen.getByTestId('club-pods-page-new'));
    fireEvent.click(await screen.findByTestId('pod-kind-normal'));
    expect(screen.getByTestId('where')).toHaveTextContent('/clubs/c1/pods/new');
  });

  it('closes the chooser on dismiss without navigating', async () => {
    h.flag.mockReturnValue(true);
    launcher();
    fireEvent.click(screen.getByTestId('club-pods-page-new'));
    fireEvent.click(await screen.findByTestId('pod-kind-chooser-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('pod-kind-chooser')).not.toBeInTheDocument());
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });
});

describe('ClubPodActivityDialog', () => {
  const entry = {
    id: 'e1',
    action: 'UPDATE',
    source: 'CLUB_ADMIN',
    actor_name: 'Asha',
    note: 'Moved the start',
    changes: [{ field: 'time', from: '6', to: '7' }],
    ai_risk: 'LOW',
    ai_summary: '',
    created_at: '2026-06-01T10:00:00.000Z',
  };

  it('stays closed and does not query without a pod', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: undefined });
    render(<ClubPodActivityDialog pod={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('club-pod-activity-dialog-close')).not.toBeInTheDocument();
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true });
  });

  it('shows the error, the spinner, the empty note, or the trail, and closes', () => {
    const onClose = vi.fn();
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: { message: 'Denied' } });
    const { rerender } = render(<ClubPodActivityDialog pod={{ id: 'p1', pod_title: 'Run' }} onClose={onClose} />);
    expect(screen.getByTestId('club-pod-activity-dialog-error')).toHaveTextContent('Denied');
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { pod_doc_id: 'p1' }, skip: false });

    h.useQuery.mockReturnValue({ data: undefined, loading: true, error: undefined });
    rerender(<ClubPodActivityDialog pod={{ id: 'p1', pod_title: 'Run' }} onClose={onClose} />);
    expect(screen.getByTestId('club-pod-activity-dialog-loading')).toBeInTheDocument();

    h.useQuery.mockReturnValue({ data: { clubAdminPodAuditLogs: [] }, loading: false, error: undefined });
    rerender(<ClubPodActivityDialog pod={{ id: 'p1', pod_title: 'Run' }} onClose={onClose} />);
    expect(screen.getByTestId('club-pod-activity-dialog-empty')).toHaveTextContent(fallbackT('clubAdmin.pods.noActivity'));

    h.useQuery.mockReturnValue({ data: { clubAdminPodAuditLogs: [entry] }, loading: true, error: undefined });
    rerender(<ClubPodActivityDialog pod={{ id: 'p1', pod_title: 'Run' }} onClose={onClose} />);
    expect(screen.getByTestId('audit-changes-list-time')).toHaveTextContent('time: 6 → 7');
    expect(screen.getByText('Moved the start')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('club-pod-activity-dialog-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useDeletePod', () => {
  const setup = (deletePod: ReturnType<typeof vi.fn>, loading = false) => {
    h.useMutation.mockReturnValue([deletePod, { loading }]);
    const onDeleted = vi.fn();
    const hook = renderHook(() => useDeletePod(onDeleted));
    return { hook, onDeleted };
  };

  it('asks, then deletes the targeted pod, reloads and clears the target', async () => {
    const deletePod = vi.fn().mockResolvedValue({});
    const { hook, onDeleted } = setup(deletePod);
    act(() => hook.result.current.ask(pod()));
    expect(hook.result.current.target?.id).toBe('p1');
    act(() => hook.result.current.confirm());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deletePod).toHaveBeenCalledWith({ variables: { pod_doc_id: 'p1' } });
    expect(h.success).toHaveBeenCalledWith(fallbackT('clubAdmin.pods.podDeleted'));
    expect(hook.result.current.target).toBeNull();
  });

  it('reports a failed delete, does not reload, and still clears the target', async () => {
    const deletePod = vi.fn().mockRejectedValue(new Error('nope'));
    const { hook, onDeleted } = setup(deletePod);
    act(() => hook.result.current.ask(pod()));
    act(() => hook.result.current.confirm());
    await waitFor(() => expect(h.error).toHaveBeenCalledTimes(1));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(hook.result.current.target).toBeNull();
  });

  it('does nothing when confirmed without a target, and cancel clears it', () => {
    const deletePod = vi.fn();
    const { hook } = setup(deletePod, true);
    expect(hook.result.current.busy).toBe(true);
    act(() => hook.result.current.confirm());
    expect(deletePod).not.toHaveBeenCalled();
    act(() => hook.result.current.ask(pod()));
    act(() => hook.result.current.cancel());
    expect(hook.result.current.target).toBeNull();
  });
});
