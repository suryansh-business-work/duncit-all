import type { BackgroundJob } from '../src/background-jobs/queries';

/**
 * A bulk delete as `myBackgroundJobs` returns it — the coupons table in the
 * Finance console, 40 rows in scope.
 */
export function makeJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: 'DUN-JOB-7001',
    kind: 'BULK_DELETE',
    table: 'couponsTable',
    label: 'Coupons',
    url: 'https://finance.duncit.com/coupons',
    mode: 'ALL',
    status: 'RUNNING',
    total: 40,
    succeeded: 10,
    failed: 0,
    failures: [],
    error_message: '',
    created_at: '2026-09-17T10:30:00.000Z',
    finished_at: null,
    ...overrides,
  };
}
