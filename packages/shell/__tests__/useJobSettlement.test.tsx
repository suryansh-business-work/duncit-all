import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackgroundJob } from '../src/background-jobs/queries';
import { makeJob } from './background-jobs-fixtures';

const { notify, notifyError, notifySuccess } = vi.hoisted(() => ({
  notify: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify,
  notifyError,
  notifySuccess,
}));

const { useJobSettlement } = await import('../src/background-jobs/useJobSettlement');

function renderSettlement(initial: readonly BackgroundJob[]) {
  return renderHook(({ jobs }: { jobs: readonly BackgroundJob[] }) => useJobSettlement(jobs), {
    initialProps: { jobs: initial },
  });
}

const anyNotice = () => notify.mock.calls.length + notifyError.mock.calls.length + notifySuccess.mock.calls.length;

beforeEach(() => {
  notify.mockReset();
  notifyError.mockReset();
  notifySuccess.mockReset();
});

describe('useJobSettlement', () => {
  it('announces nothing for jobs that were already finished when the console opened', () => {
    const { rerender } = renderSettlement([makeJob({ status: 'COMPLETED', succeeded: 40 })]);
    rerender({ jobs: [makeJob({ status: 'COMPLETED', succeeded: 40 })] });
    expect(anyNotice()).toBe(0);
  });

  it('stays quiet while a job keeps running', () => {
    const { rerender } = renderSettlement([makeJob()]);
    rerender({ jobs: [makeJob({ succeeded: 20 })] });
    expect(anyNotice()).toBe(0);
  });

  it('tells the grids on that table, and says how many rows went, once a job completes', () => {
    const { result, rerender } = renderSettlement([makeJob()]);
    const coupons = vi.fn();
    const pods = vi.fn();
    result.current.subscribe('couponsTable', coupons);
    result.current.subscribe('podsTable', pods);

    rerender({ jobs: [makeJob({ status: 'COMPLETED', succeeded: 40 })] });

    expect(coupons).toHaveBeenCalledTimes(1);
    expect(pods).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Coupons: 40 rows deleted.');
  });

  it('warns when some rows could not be deleted', () => {
    const { rerender } = renderSettlement([makeJob()]);
    rerender({ jobs: [makeJob({ status: 'COMPLETED', succeeded: 38, failed: 2 })] });
    expect(notify).toHaveBeenCalledWith('Coupons: 38 deleted, 2 could not be deleted.', 'warning');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('reports why a job stopped', () => {
    const { rerender } = renderSettlement([makeJob()]);
    rerender({ jobs: [makeJob({ status: 'FAILED', error_message: 'Access to Coupons was revoked' })] });
    expect(notifyError).toHaveBeenCalledWith(
      'Coupons: the delete stopped — Access to Coupons was revoked',
    );
  });

  it('lets a cancel pass quietly but still refreshes the grids', () => {
    const { result, rerender } = renderSettlement([makeJob()]);
    const coupons = vi.fn();
    result.current.subscribe('couponsTable', coupons);
    rerender({ jobs: [makeJob({ status: 'CANCELLED' })] });
    expect(coupons).toHaveBeenCalledTimes(1);
    expect(anyNotice()).toBe(0);
  });

  it('announces a job it was told was started, even if it is never seen running', () => {
    const { result, rerender } = renderSettlement([]);
    result.current.track('DUN-JOB-7002');
    rerender({ jobs: [makeJob({ id: 'DUN-JOB-7002', status: 'COMPLETED', succeeded: 1, label: 'Feature flags' })] });
    expect(notifySuccess).toHaveBeenCalledWith('Feature flags: 1 row deleted.');
  });

  it('stops calling a listener once it unsubscribes, and keeps the others on that table', () => {
    const { result, rerender } = renderSettlement([makeJob()]);
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = result.current.subscribe('couponsTable', first);
    result.current.subscribe('couponsTable', second);
    unsubscribeFirst();

    rerender({ jobs: [makeJob({ status: 'COMPLETED', succeeded: 40 })] });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
