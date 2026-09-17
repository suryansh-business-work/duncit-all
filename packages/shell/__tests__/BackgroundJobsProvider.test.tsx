import { act, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BulkDeleteRequest, TableBulkDeleteApi } from '@duncit/table';
import type { BackgroundJobsApi } from '../src/background-jobs/backgroundJobsContext';
import type { BackgroundJob } from '../src/background-jobs/queries';
import { makeJob } from './background-jobs-fixtures';

const { apollo, notify, notifyError, notifySuccess, warn } = vi.hoisted(() => ({
  apollo: { useQuery: vi.fn(), useMutation: vi.fn() },
  notify: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@apollo/client/react', () => apollo);
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify,
  notifyError,
  notifySuccess,
}));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}));

const { useTableBulkDeleteApi } = await import('@duncit/table');
const { BackgroundJobsProvider } = await import('../src/background-jobs/BackgroundJobsProvider');
const { useBackgroundJobs } = await import('../src/background-jobs/backgroundJobsContext');
const queries = await import('../src/background-jobs/queries');

const seen: { jobs: BackgroundJobsApi | null; table: TableBulkDeleteApi | null } = { jobs: null, table: null };

function Probe() {
  seen.jobs = useBackgroundJobs();
  seen.table = useTableBulkDeleteApi();
  return null;
}

function jobsApi(): BackgroundJobsApi {
  if (!seen.jobs) throw new Error('BackgroundJobsContext was not provided');
  return seen.jobs;
}

function tableApi(): TableBulkDeleteApi {
  if (!seen.table) throw new Error('TableBulkDeleteProvider was not provided');
  return seen.table;
}

const tree = (enabled: boolean): ReactElement => (
  <BackgroundJobsProvider enabled={enabled}>
    <Probe />
  </BackgroundJobsProvider>
);

const REQUEST: BulkDeleteRequest = {
  table: 'couponsTable',
  mode: 'SELECTED',
  variables: { query: { search: 'MONSOON', page: 1, page_size: 25 } },
  ids: ['DUN-CPN-101', 'DUN-CPN-102'],
  label: 'Coupons',
  url: 'https://finance.duncit.com/coupons',
};

interface QueryState<T> {
  data: T | undefined;
  startPolling: ReturnType<typeof vi.fn>;
  stopPolling: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
}

const makeQuery = <T,>(data: T | undefined): QueryState<T> => ({
  data,
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  refetch: vi.fn().mockResolvedValue({}),
});

let tablesQuery: QueryState<{ bulkDeletableTables: string[] }>;
let jobsQuery: QueryState<{ myBackgroundJobs: BackgroundJob[] }>;
const startDelete = vi.fn();
const cancelJob = vi.fn();
const dismissJob = vi.fn();
const clearJobs = vi.fn();
let visibility: DocumentVisibilityState = 'visible';

const showTab = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  seen.jobs = null;
  seen.table = null;
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  tablesQuery = makeQuery({ bulkDeletableTables: ['couponsTable', 'featureFlagsTable'] });
  jobsQuery = makeQuery({ myBackgroundJobs: [] });
  for (const mock of [startDelete, cancelJob, dismissJob, clearJobs, notify, notifyError, notifySuccess, warn]) {
    mock.mockReset();
  }
  cancelJob.mockResolvedValue({});
  dismissJob.mockResolvedValue({});
  clearJobs.mockResolvedValue({});
  const mutations = new Map<unknown, ReturnType<typeof vi.fn>>([
    [queries.START_BULK_DELETE, startDelete],
    [queries.CANCEL_BACKGROUND_JOB, cancelJob],
    [queries.DISMISS_BACKGROUND_JOB, dismissJob],
    [queries.CLEAR_FINISHED_BACKGROUND_JOBS, clearJobs],
  ]);
  apollo.useQuery.mockImplementation((doc: unknown) =>
    doc === queries.BULK_DELETABLE_TABLES ? tablesQuery : jobsQuery,
  );
  apollo.useMutation.mockImplementation((doc: unknown) => [mutations.get(doc)]);
});

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('BackgroundJobsProvider before sign-in', () => {
  it('asks the server nothing and offers no tables', () => {
    tablesQuery.data = undefined;
    jobsQuery.data = undefined;
    render(tree(false));

    expect(apollo.useQuery).toHaveBeenCalledWith(queries.BULK_DELETABLE_TABLES, { skip: true });
    expect(apollo.useQuery).toHaveBeenCalledWith(queries.MY_BACKGROUND_JOBS, {
      skip: true,
      fetchPolicy: 'network-only',
    });
    expect(jobsApi().jobs).toEqual([]);
    expect(tableApi().tables.size).toBe(0);

    showTab('visible');
    expect(jobsQuery.refetch).not.toHaveBeenCalled();
    expect(jobsQuery.startPolling).not.toHaveBeenCalled();
  });
});

describe('BackgroundJobsProvider reading jobs', () => {
  it('hands the grids the tables this person may bulk delete from', () => {
    render(tree(true));
    expect(tableApi().tables.has('couponsTable')).toBe(true);
    expect(tableApi().tables.has('podsTable')).toBe(false);
  });

  it('polls only while a job runs, and stops once it has finished', () => {
    jobsQuery.data = { myBackgroundJobs: [makeJob()] };
    const { rerender } = render(tree(true));
    expect(jobsQuery.startPolling).toHaveBeenCalledWith(1500);
    expect(jobsApi().jobs).toHaveLength(1);

    jobsQuery.data = { myBackgroundJobs: [makeJob({ status: 'COMPLETED', succeeded: 40 })] };
    rerender(tree(true));
    expect(jobsQuery.stopPolling).toHaveBeenCalledTimes(1);
    expect(jobsQuery.startPolling).toHaveBeenCalledTimes(1);
  });

  it('does not poll a list of finished jobs', () => {
    jobsQuery.data = { myBackgroundJobs: [makeJob({ status: 'CANCELLED' })] };
    render(tree(true));
    expect(jobsQuery.startPolling).not.toHaveBeenCalled();
  });

  it('re-reads the jobs when the tab comes back into view, and only then', () => {
    const { unmount } = render(tree(true));

    showTab('hidden');
    expect(jobsQuery.refetch).not.toHaveBeenCalled();

    showTab('visible');
    expect(jobsQuery.refetch).toHaveBeenCalledTimes(1);

    unmount();
    showTab('visible');
    expect(jobsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('logs a re-read that failed instead of throwing it', async () => {
    const error = new Error('Network request failed');
    jobsQuery.refetch.mockRejectedValue(error);
    render(tree(true));

    await act(async () => {
      showTab('visible');
    });

    expect(warn).toHaveBeenCalledWith('backgroundJobs', 'refetch', {
      error,
      msg: 'Could not reload background jobs',
    });
  });
});

describe('BackgroundJobsProvider starting a bulk delete', () => {
  it('sends the ticked rows, says it started, and announces the job when it finishes', async () => {
    startDelete.mockResolvedValue({ data: { startBulkDelete: { id: 'DUN-JOB-7003' } } });
    const { rerender } = render(tree(true));

    let started = false;
    await act(async () => {
      started = await tableApi().start(REQUEST);
    });

    expect(started).toBe(true);
    expect(startDelete).toHaveBeenCalledWith({
      variables: {
        input: {
          table: 'couponsTable',
          mode: 'SELECTED',
          variables: JSON.stringify(REQUEST.variables),
          ids: ['DUN-CPN-101', 'DUN-CPN-102'],
          label: 'Coupons',
          url: 'https://finance.duncit.com/coupons',
        },
      },
    });
    expect(notifySuccess).toHaveBeenCalledWith('Deletion started. Follow it from the header.');
    expect(jobsQuery.refetch).toHaveBeenCalledTimes(1);

    // Tracked as running, so it is announced even though no poll saw it run.
    jobsQuery.data = {
      myBackgroundJobs: [makeJob({ id: 'DUN-JOB-7003', status: 'COMPLETED', succeeded: 2 })],
    };
    rerender(tree(true));
    expect(notifySuccess).toHaveBeenLastCalledWith('Coupons: 2 rows deleted.');
  });

  it('sends no ids for "all matching", and still counts a start whose reply carried no job', async () => {
    startDelete.mockResolvedValue({ data: null });
    jobsQuery.refetch.mockRejectedValue(new Error('Network request failed'));
    render(tree(true));

    let started = false;
    await act(async () => {
      started = await tableApi().start({ ...REQUEST, mode: 'ALL', ids: [] });
    });

    expect(started).toBe(true);
    expect(startDelete.mock.calls[0][0].variables.input).toMatchObject({ mode: 'ALL', ids: null });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('shows the server refusal and reports the job as not started', async () => {
    startDelete.mockRejectedValue(new Error('You may not delete from couponsTable'));
    render(tree(true));

    let started = true;
    await act(async () => {
      started = await tableApi().start(REQUEST);
    });

    expect(started).toBe(false);
    expect(notifyError).toHaveBeenCalledWith('You may not delete from couponsTable');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(jobsQuery.refetch).not.toHaveBeenCalled();
  });

  it('shows a refusal that is not an Error as text', async () => {
    startDelete.mockRejectedValue('Too many background jobs');
    render(tree(true));

    await act(async () => {
      await tableApi().start(REQUEST);
    });

    expect(notifyError).toHaveBeenCalledWith('Too many background jobs');
  });

  it('lets a grid subscribe to its table settling', () => {
    jobsQuery.data = { myBackgroundJobs: [makeJob()] };
    const { rerender } = render(tree(true));
    const refetchCoupons = vi.fn();
    tableApi().onSettled('couponsTable', refetchCoupons);

    jobsQuery.data = { myBackgroundJobs: [makeJob({ status: 'CANCELLED' })] };
    rerender(tree(true));
    expect(refetchCoupons).toHaveBeenCalledTimes(1);
  });
});

describe('BackgroundJobsProvider job actions', () => {
  it('stops, removes and clears jobs, re-reading the list after each', async () => {
    render(tree(true));

    await act(async () => {
      await jobsApi().cancel('DUN-JOB-7001');
      await jobsApi().dismiss('DUN-JOB-7002');
      await jobsApi().clearFinished();
    });

    expect(cancelJob).toHaveBeenCalledWith({ variables: { id: 'DUN-JOB-7001' } });
    expect(dismissJob).toHaveBeenCalledWith({ variables: { id: 'DUN-JOB-7002' } });
    expect(clearJobs).toHaveBeenCalledTimes(1);
    expect(jobsQuery.refetch).toHaveBeenCalledTimes(3);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('shows why an action failed and still re-reads the list', async () => {
    cancelJob.mockRejectedValue(new Error('This job has already finished'));
    render(tree(true));

    await act(async () => {
      await jobsApi().cancel('DUN-JOB-7001');
    });

    expect(notifyError).toHaveBeenCalledWith('This job has already finished');
    expect(jobsQuery.refetch).toHaveBeenCalledTimes(1);
  });
});
