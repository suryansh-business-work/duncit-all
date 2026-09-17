import { describe, expect, it } from 'vitest';
import { isRunning, jobPercent, overallPercent } from '../src/background-jobs/job-progress';
import { makeJob } from './background-jobs-fixtures';

describe('isRunning', () => {
  it('is true only while the server is still deleting', () => {
    expect(isRunning(makeJob())).toBe(true);
    expect(isRunning(makeJob({ status: 'CANCELLED' }))).toBe(false);
  });
});

describe('jobPercent', () => {
  it('reads a completed job as done even when its counts fall short', () => {
    expect(jobPercent(makeJob({ status: 'COMPLETED', succeeded: 37, failed: 0 }))).toBe(100);
  });

  it('reads 0 for a job with nothing in scope yet', () => {
    expect(jobPercent(makeJob({ total: 0, succeeded: 0 }))).toBe(0);
  });

  it('counts refused rows as dealt with, and never passes the total', () => {
    expect(jobPercent(makeJob({ succeeded: 10, failed: 3 }))).toBe(33);
    expect(jobPercent(makeJob({ status: 'FAILED', succeeded: 45, failed: 5 }))).toBe(100);
  });
});

describe('overallPercent', () => {
  it('reads 0 when nothing is running', () => {
    expect(overallPercent([])).toBe(0);
    expect(overallPercent([makeJob({ status: 'COMPLETED' })])).toBe(0);
  });

  it('weights each running job by its size and ignores finished ones', () => {
    const jobs = [
      makeJob({ id: 'DUN-JOB-7001', total: 10, succeeded: 10 }),
      makeJob({ id: 'DUN-JOB-7002', total: 990, succeeded: 0 }),
      makeJob({ id: 'DUN-JOB-7003', status: 'COMPLETED', total: 500, succeeded: 500 }),
    ];
    expect(overallPercent(jobs)).toBe(1);
  });
});
