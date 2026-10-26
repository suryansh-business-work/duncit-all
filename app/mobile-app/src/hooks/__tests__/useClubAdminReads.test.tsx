import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import { emptyClubAdminDashboard } from '@duncit/utils';

import { PodHelpStatus, TableSortDir } from '@/generated/graphql/graphql';
import {
  ClubAdminClubDocument,
  ClubAdminDashboardDocument,
  ClubAdminPodAuditLogsTableDocument,
  ClubAdminPodsTableDocument,
  ClubAdminUpdateClubDocument,
  MyAdminClubsTableDocument,
} from '@/graphql/club-admin';
import { ClubAdminsDocument } from '@/graphql/host-manage';
import { RequestPodClubAdminHelpDocument } from '@/graphql/pod-help';
import { useClubAdminAuditLogs } from '@/hooks/useClubAdminAuditLogs';
import { useClubAdminClubs } from '@/hooks/useClubAdminClubs';
import { useClubAdminDashboard } from '@/hooks/useClubAdminDashboard';
import { useClubAdminPods } from '@/hooks/useClubAdminPods';
import { useClubAdmins } from '@/hooks/useClubAdmins';
import { useClubEdit } from '@/hooks/useClubEdit';
import { PodHelpSide, usePodClubAdminHelp } from '@/hooks/usePodClubAdminHelp';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
// The pull gesture's handler is only reachable if the registration is captured.
const mockRegistered: (() => void)[] = [];
jest.mock('@/components/PullToRefresh', () => ({
  useRefreshRegistration: (handler: () => void) => mockRegistered.push(handler),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/utils/app-formatter', () => ({
  ...jest.requireActual('@/utils/app-formatter'),
  appNow: () => new Date('2026-10-26T10:00:00Z'),
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const AUTH = { auth: true };

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

describe('useClubEdit', () => {
  it('reads the club to edit, loading until it lands', async () => {
    request.mockResolvedValue({ club: { id: 'c1', club_name: 'Smash' } });
    const { result } = renderHook(() => useClubEdit('c1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledWith(ClubAdminClubDocument, { club_doc_id: 'c1' }, AUTH);
    expect(result.current.club).toEqual({ id: 'c1', club_name: 'Smash' });
    expect(result.current.hasError).toBe(false);
    expect(result.current.notFound).toBe(false);
  });

  it('says not found when the club does not exist for this admin', async () => {
    request.mockResolvedValue({ club: null });
    const { result } = renderHook(() => useClubEdit('c1'));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.club).toBeNull();
  });

  it('says the read failed, which is not the same as not found, and recovers on refetch', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useClubEdit('c1'));
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.notFound).toBe(false);
    request.mockResolvedValueOnce({ club: { id: 'c1' } });
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.club).toEqual({ id: 'c1' }));
    expect(result.current.hasError).toBe(false);
  });

  it('writes the club back with the input', async () => {
    request.mockResolvedValue({ club: { id: 'c1' } });
    const { result } = renderHook(() => useClubEdit('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    request.mockResolvedValueOnce({});
    await act(async () => result.current.save({ club_name: 'Rally' }));
    expect(request).toHaveBeenLastCalledWith(
      ClubAdminUpdateClubDocument,
      { club_doc_id: 'c1', input: { club_name: 'Rally' } },
      AUTH,
    );
  });

  it('lets a failed save reach the caller', async () => {
    request.mockResolvedValue({ club: { id: 'c1' } });
    const { result } = renderHook(() => useClubEdit('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    request.mockRejectedValueOnce(new Error('Name taken'));
    await expect(result.current.save({ club_name: 'x' })).rejects.toThrow('Name taken');
  });

  it('ignores an answer that arrives after another club was asked for', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)));
    const { result, rerender } = renderHook(({ id }: { id: string }) => useClubEdit(id), {
      initialProps: { id: 'c1' },
    });
    request.mockResolvedValueOnce({ club: { id: 'c2' } });
    rerender({ id: 'c2' });
    await waitFor(() => expect(result.current.club).toEqual({ id: 'c2' }));
    await act(async () => finishFirst({ club: { id: 'c1' } }));
    expect(result.current.club).toEqual({ id: 'c2' });
  });

  it('ignores a failure that arrives after another club was asked for', async () => {
    let failFirst: (reason: Error) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)));
    const { result, rerender } = renderHook(({ id }: { id: string }) => useClubEdit(id), {
      initialProps: { id: 'c1' },
    });
    request.mockResolvedValueOnce({ club: { id: 'c2' } });
    rerender({ id: 'c2' });
    await waitFor(() => expect(result.current.club).toEqual({ id: 'c2' }));
    await act(async () => failFirst(new Error('late')));
    expect(result.current.hasError).toBe(false);
  });
});

describe('useClubAdminClubs', () => {
  const rows = [{ id: 'c1' }, { id: 'c2' }];

  it('reads the first page of the clubs the admin runs, with no search by default', async () => {
    request.mockResolvedValue({ myAdminClubsTable: { rows } });
    const { result } = renderHook(() => useClubAdminClubs());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.clubs).toEqual(rows));
    expect(request).toHaveBeenCalledWith(
      MyAdminClubsTableDocument,
      { query: { search: null, page: 1, page_size: 50 } },
      AUTH,
    );
    expect(result.current.hasError).toBe(false);
  });

  it('searches on the server and reads again when the search changes', async () => {
    request.mockResolvedValue({ myAdminClubsTable: { rows } });
    const { result, rerender } = renderHook(({ q }: { q: string }) => useClubAdminClubs(q), {
      initialProps: { q: 'smash' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request.mock.calls[0][1].query.search).toBe('smash');
    rerender({ q: 'rally' });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1].query.search).toBe('rally');
  });

  it('says the read failed and recovers on refetch', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useClubAdminClubs());
    await waitFor(() => expect(result.current.hasError).toBe(true));
    request.mockResolvedValueOnce({ myAdminClubsTable: { rows } });
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.clubs).toEqual(rows));
    expect(result.current.hasError).toBe(false);
  });

  it('ignores answers and failures of a search that was replaced', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    let failFirst: (reason: Error) => void = () => undefined;
    request
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)))
      .mockResolvedValue({ myAdminClubsTable: { rows: [{ id: 'fresh' }] } });
    const { result, rerender } = renderHook(({ q }: { q: string }) => useClubAdminClubs(q), {
      initialProps: { q: 'a' },
    });
    rerender({ q: 'b' });
    rerender({ q: 'c' });
    await waitFor(() => expect(result.current.clubs).toEqual([{ id: 'fresh' }]));
    await act(async () => finishFirst({ myAdminClubsTable: { rows: [{ id: 'stale' }] } }));
    await act(async () => failFirst(new Error('late')));
    expect(result.current.clubs).toEqual([{ id: 'fresh' }]);
    expect(result.current.hasError).toBe(false);
  });
});

describe('useClubAdminDashboard', () => {
  it('starts on the empty dashboard and reads the range from the shared window rule', async () => {
    request.mockResolvedValue({
      clubAdminDashboard: { ...emptyClubAdminDashboard, trend: [{ label: 'Oct' }] },
    });
    const { result } = renderHook(() => useClubAdminDashboard('all'));
    expect(result.current.data).toBe(emptyClubAdminDashboard);
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledWith(
      ClubAdminDashboardDocument,
      { from: null, to: null },
      AUTH,
    );
    expect(result.current.data.trend).toEqual([{ label: 'Oct' }]);
  });

  it('asks for a bounded window for a bounded range, and again when the range changes', async () => {
    request.mockResolvedValue({ clubAdminDashboard: emptyClubAdminDashboard });
    const { result, rerender } = renderHook(
      ({ range }: { range: 'all' | '30d' }) => useClubAdminDashboard(range),
      { initialProps: { range: '30d' as 'all' | '30d' } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof request.mock.calls[0][1].from).toBe('string');
    rerender({ range: 'all' });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1].from).toBeNull();
  });

  it('says the read failed and recovers on refetch', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useClubAdminDashboard('all'));
    await waitFor(() => expect(result.current.hasError).toBe(true));
    request.mockResolvedValueOnce({ clubAdminDashboard: emptyClubAdminDashboard });
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.hasError).toBe(false));
  });

  it('ignores an answer and a failure of a range that was replaced', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    let failSecond: (reason: Error) => void = () => undefined;
    request
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(() => new Promise((_, reject) => (failSecond = reject)))
      .mockResolvedValue({
        clubAdminDashboard: { ...emptyClubAdminDashboard, trend: [{ label: 'fresh' }] },
      });
    const { result, rerender } = renderHook(
      ({ range }: { range: 'all' | '30d' | '12m' }) => useClubAdminDashboard(range),
      { initialProps: { range: 'all' as 'all' | '30d' | '12m' } },
    );
    rerender({ range: '30d' });
    rerender({ range: '12m' });
    await waitFor(() => expect(result.current.data.trend).toEqual([{ label: 'fresh' }]));
    await act(async () => finishFirst({ clubAdminDashboard: emptyClubAdminDashboard }));
    await act(async () => failSecond(new Error('late')));
    expect(result.current.data.trend).toEqual([{ label: 'fresh' }]);
    expect(result.current.hasError).toBe(false);
  });
});

describe('useClubAdmins', () => {
  it('stays idle without a club', () => {
    const { result } = renderHook(() => useClubAdmins(null));
    expect(request).not.toHaveBeenCalled();
    expect(result.current).toEqual({ admins: [], isLoading: false, hasError: false });
  });

  it('reads the admins of a club', async () => {
    request.mockResolvedValue({ club: { club_admins: [{ id: 'a1' }] } });
    const { result } = renderHook(() => useClubAdmins('c1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.admins).toEqual([{ id: 'a1' }]));
    expect(request).toHaveBeenCalledWith(ClubAdminsDocument, { club_doc_id: 'c1' });
    expect(result.current.isLoading).toBe(false);
  });

  it('shows no admins for a club that is not found', async () => {
    request.mockResolvedValue({ club: null });
    const { result } = renderHook(() => useClubAdmins('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.admins).toEqual([]);
  });

  it('says the read failed', async () => {
    request.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useClubAdmins('c1'));
    await waitFor(() => expect(result.current.hasError).toBe(true));
  });

  it('never shows the previous club admins under the next club', async () => {
    let finishSecond: (value: unknown) => void = () => undefined;
    request.mockResolvedValueOnce({ club: { club_admins: [{ id: 'a1' }] } });
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useClubAdmins(id), {
      initialProps: { id: 'c1' as string | null },
    });
    await waitFor(() => expect(result.current.admins).toEqual([{ id: 'a1' }]));
    request.mockImplementationOnce(() => new Promise((resolve) => (finishSecond = resolve)));
    rerender({ id: 'c2' });
    await waitFor(() => expect(result.current.admins).toEqual([]));
    await act(async () => finishSecond({ club: { club_admins: [{ id: 'a2' }] } }));
    expect(result.current.admins).toEqual([{ id: 'a2' }]);
  });

  it('reads the admins again on a pull-to-refresh', async () => {
    request.mockResolvedValue({ club: { club_admins: [{ id: 'a1' }] } });
    const { result } = renderHook(() => useClubAdmins('c1'));
    await waitFor(() => expect(result.current.admins).toEqual([{ id: 'a1' }]));
    request.mockResolvedValue({ club: { club_admins: [{ id: 'a1' }, { id: 'a2' }] } });
    act(() => mockRegistered.at(-1)?.());
    await waitFor(() => expect(result.current.admins).toHaveLength(2));
  });

  it('keeps what it had while closed, so a closing sheet can fade out on it', async () => {
    request.mockResolvedValueOnce({ club: { club_admins: [{ id: 'a1' }] } });
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useClubAdmins(id), {
      initialProps: { id: 'c1' as string | null },
    });
    await waitFor(() => expect(result.current.admins).toEqual([{ id: 'a1' }]));
    rerender({ id: null });
    expect(result.current.admins).toEqual([{ id: 'a1' }]);
  });

  it('ignores an answer and a failure of a club that was replaced', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    let failSecond: (reason: Error) => void = () => undefined;
    request
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(() => new Promise((_, reject) => (failSecond = reject)))
      .mockResolvedValue({ club: { club_admins: [{ id: 'fresh' }] } });
    const { result, rerender } = renderHook(({ id }: { id: string }) => useClubAdmins(id), {
      initialProps: { id: 'c1' },
    });
    rerender({ id: 'c2' });
    rerender({ id: 'c3' });
    await waitFor(() => expect(result.current.admins).toEqual([{ id: 'fresh' }]));
    await act(async () => finishFirst({ club: { club_admins: [{ id: 'stale' }] } }));
    await act(async () => failSecond(new Error('late')));
    expect(result.current.admins).toEqual([{ id: 'fresh' }]);
    expect(result.current.hasError).toBe(false);
  });
});

describe('useClubAdminPods', () => {
  const page = { clubAdminPodsTable: { rows: [{ id: 'p1' }], total: 1 } };

  it('reads page one of a club pods, newest first, with no filter by default', async () => {
    request.mockResolvedValue(page);
    const { result } = renderHook(() => useClubAdminPods('c1', ''));
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'p1' }]));
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodsTableDocument,
      {
        club_id: 'c1',
        query: {
          search: null,
          page: 1,
          page_size: 20,
          sort_by: 'pod_date_time',
          sort_dir: TableSortDir.Desc,
        },
        status: null,
      },
      AUTH,
    );
  });

  it('narrows by status and search on the server', async () => {
    request.mockResolvedValue(page);
    renderHook(() => useClubAdminPods('c1', 'ACTIVE', 'smash'));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][1]).toMatchObject({ status: 'ACTIVE' });
    expect(request.mock.calls[0][1].query.search).toBe('smash');
  });
});

describe('useClubAdminAuditLogs', () => {
  it('reads the first page of the trail with no search by default', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogsTable: { rows: [{ id: 'a1' }], total: 1 } });
    const { result } = renderHook(() => useClubAdminAuditLogs(''));
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'a1' }]));
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodAuditLogsTableDocument,
      { query: { page: 1, page_size: 20, search: null } },
      AUTH,
    );
  });

  it('searches the trail on the server', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogsTable: { rows: [], total: 0 } });
    renderHook(() => useClubAdminAuditLogs('deleted'));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][1].query.search).toBe('deleted');
  });
});

describe('usePodClubAdminHelp', () => {
  const answer = (status: PodHelpStatus) => ({ requestPodClubAdminHelp: { status } });

  it('does nothing without a pod', async () => {
    const { result } = renderHook(() => usePodClubAdminHelp(null, PodHelpSide.Host));
    await act(async () => result.current.ask());
    expect(request).not.toHaveBeenCalled();
    expect(result.current.outcome).toBeNull();
  });

  it.each([
    [PodHelpStatus.Sent, 'mweb.podClubAdmin.askHelpSent', '$success', false],
    [PodHelpStatus.AlreadyRequested, 'mweb.podClubAdmin.askHelpAlready', '$color', false],
    [PodHelpStatus.NoClubAdmin, 'mweb.podClubAdmin.askHelpNoAdmin', '$warning', false],
  ])('reads a %s answer as its own line', async (status, key, color, retry) => {
    request.mockResolvedValue(answer(status));
    const { result } = renderHook(() => usePodClubAdminHelp('p1', PodHelpSide.Venue));
    await act(async () => result.current.ask());
    expect(request).toHaveBeenCalledWith(
      RequestPodClubAdminHelpDocument,
      { pod_doc_id: 'p1', side: PodHelpSide.Venue },
      AUTH,
    );
    expect(result.current.outcome).toEqual({ key, color, retry });
    expect(result.current.loading).toBe(false);
  });

  it('shows a loading state while asking', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => usePodClubAdminHelp('p1', PodHelpSide.Host));
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.ask();
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      finish(answer(PodHelpStatus.Sent));
      await pending;
    });
    expect(result.current.loading).toBe(false);
  });

  it('says the ask failed, allows another try, and logs why', async () => {
    const failure = new Error('offline');
    request.mockRejectedValue(failure);
    const { result } = renderHook(() => usePodClubAdminHelp('p1', PodHelpSide.Host));
    await act(async () => result.current.ask());
    expect(result.current.outcome).toEqual({
      key: 'mweb.podClubAdmin.askHelpFailed',
      color: '$danger',
      retry: true,
    });
    expect(logs.mobileApp.error).toHaveBeenCalledWith('usePodClubAdminHelp', 'ask', {
      error: failure,
      pod_id: 'p1',
      side: PodHelpSide.Host,
    });
  });

  it('keeps the outcome with the pod it was asked for, never under another pod', async () => {
    request.mockResolvedValue(answer(PodHelpStatus.Sent));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => usePodClubAdminHelp(id, PodHelpSide.Host),
      { initialProps: { id: 'p1' } },
    );
    await act(async () => result.current.ask());
    expect(result.current.outcome?.key).toBe('mweb.podClubAdmin.askHelpSent');
    rerender({ id: 'p2' });
    expect(result.current.outcome).toBeNull();
  });
});
