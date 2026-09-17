import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JobRow } from '../src/background-jobs/JobRow';
import type { BackgroundJob } from '../src/background-jobs/queries';
import { makeJob } from './background-jobs-fixtures';

function renderRow(job: BackgroundJob) {
  const onCancel = vi.fn().mockResolvedValue(undefined);
  const onDismiss = vi.fn().mockResolvedValue(undefined);
  render(<JobRow job={job} onCancel={onCancel} onDismiss={onDismiss} />);
  return { onCancel, onDismiss };
}

describe('JobRow', () => {
  it('shows a running job with its scope, source page, progress and a Stop control', () => {
    const { onCancel, onDismiss } = renderRow(makeJob({ succeeded: 9, failed: 1 }));

    expect(screen.getByText('Deleting 40 rows')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Coupons' })).toHaveAttribute(
      'href',
      'https://finance.duncit.com/coupons',
    );
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progress 25%' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('10 of 40 · 25%')).toBeInTheDocument();
    expect(screen.getByText('1 row could not be deleted')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('background-job-cancel-DUN-JOB-7001'));
    expect(onCancel).toHaveBeenCalledWith('DUN-JOB-7001');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('shows a finished job with what it deleted and a Remove control, without a link when it has no label', () => {
    const { onCancel, onDismiss } = renderRow(
      makeJob({ status: 'COMPLETED', succeeded: 1, total: 1, label: '' }),
    );

    expect(screen.getByText('Deleted 1 row')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be deleted/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove from list' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('background-job-dismiss-DUN-JOB-7001'));
    expect(onDismiss).toHaveBeenCalledWith('DUN-JOB-7001');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('gives the reason a job stopped', () => {
    renderRow(makeJob({ status: 'FAILED', error_message: 'The server restarted twice' }));
    expect(screen.getByText('Delete stopped')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('The server restarted twice')).toBeInTheDocument();
  });

  it("falls back to the first refused row's reason", () => {
    renderRow(
      makeJob({
        status: 'CANCELLED',
        succeeded: 5,
        failed: 1,
        failures: [{ id: 'DUN-CPN-104', message: 'Coupon DUN-CPN-104 is in use by an open order' }],
      }),
    );
    expect(screen.getByText('Delete cancelled')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Coupon DUN-CPN-104 is in use by an open order')).toBeInTheDocument();
  });
});
