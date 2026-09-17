import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundJobsContext, type BackgroundJobsApi } from '../src/background-jobs/backgroundJobsContext';
import { BackgroundJobsDrawer } from '../src/background-jobs/BackgroundJobsDrawer';
import { BackgroundJobsIndicator } from '../src/background-jobs/BackgroundJobsIndicator';
import type { BackgroundJob } from '../src/background-jobs/queries';
import { makeJob } from './background-jobs-fixtures';

function makeApi(jobs: BackgroundJob[]): BackgroundJobsApi {
  return {
    jobs,
    cancel: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    clearFinished: vi.fn().mockResolvedValue(undefined),
  };
}

function renderIndicator(api: BackgroundJobsApi | null) {
  return render(
    <BackgroundJobsContext.Provider value={api}>
      <BackgroundJobsIndicator />
    </BackgroundJobsContext.Provider>,
  );
}

const indicator = () => screen.getByTestId('background-jobs-indicator');

describe('BackgroundJobsIndicator', () => {
  it('renders nothing outside the provider', () => {
    renderIndicator(null);
    expect(screen.queryByTestId('background-jobs-indicator')).not.toBeInTheDocument();
  });

  it('renders nothing while there is nothing to report', () => {
    renderIndicator(makeApi([]));
    expect(screen.queryByTestId('background-jobs-indicator')).not.toBeInTheDocument();
  });

  it('shows the overall percentage with a ring while jobs run', () => {
    renderIndicator(
      makeApi([
        makeJob({ id: 'DUN-JOB-7001', total: 40, succeeded: 20 }),
        makeJob({ id: 'DUN-JOB-7002', total: 60, succeeded: 0, label: 'Feature flags' }),
      ]),
    );
    expect(indicator()).toHaveTextContent('20%');
    expect(indicator()).toHaveAccessibleName('2 background tasks running — 20% done');
    expect(indicator()).toHaveAttribute('aria-expanded', 'false');
    expect(within(indicator()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
  });

  it('keeps a sliver of ring visible for a job that has only just started', () => {
    renderIndicator(makeApi([makeJob({ succeeded: 0 })]));
    expect(indicator()).toHaveAccessibleName('1 background task running — 0% done');
    expect(within(indicator()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });

  it('shows a tick once every job finished cleanly', () => {
    renderIndicator(makeApi([makeJob({ status: 'COMPLETED', succeeded: 40 })]));
    expect(indicator()).toHaveTextContent('Tasks');
    expect(indicator()).toHaveAccessibleName('Background tasks finished — open the list');
    expect(screen.getByTestId('TaskAltIcon')).toBeInTheDocument();
  });

  it('shows a warning when a finished job failed', () => {
    renderIndicator(makeApi([makeJob({ status: 'FAILED', error_message: 'Server restarted' })]));
    expect(screen.getByTestId('ErrorOutlinedIcon')).toBeInTheDocument();
  });

  it('shows a warning when a completed job left rows behind', () => {
    renderIndicator(makeApi([makeJob({ status: 'COMPLETED', succeeded: 38, failed: 2 })]));
    expect(screen.getByTestId('ErrorOutlinedIcon')).toBeInTheDocument();
  });

  it('opens the list of tasks and closes it again', async () => {
    renderIndicator(makeApi([makeJob()]));
    fireEvent.click(indicator());

    const drawer = await screen.findByRole('dialog', { name: 'Background tasks' });
    expect(within(drawer).getByTestId('background-job-DUN-JOB-7001')).toBeInTheDocument();
    expect(indicator()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close background tasks' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('BackgroundJobsDrawer', () => {
  it('says nothing is running when the list is empty, with nothing to clear', () => {
    render(<BackgroundJobsDrawer open onClose={vi.fn()} api={makeApi([])} />);
    expect(screen.getByText('Nothing is running.')).toBeInTheDocument();
    expect(screen.getByTestId('background-jobs-clear-finished')).toBeDisabled();
  });

  it('has nothing to clear while every job is still running', () => {
    render(<BackgroundJobsDrawer open onClose={vi.fn()} api={makeApi([makeJob()])} />);
    expect(screen.getByTestId('background-jobs-clear-finished')).toBeDisabled();
  });

  it('clears the finished jobs', () => {
    const api = makeApi([makeJob(), makeJob({ id: 'DUN-JOB-7002', status: 'COMPLETED', succeeded: 40 })]);
    render(<BackgroundJobsDrawer open onClose={vi.fn()} api={api} />);
    const clear = screen.getByTestId('background-jobs-clear-finished');
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(api.clearFinished).toHaveBeenCalledTimes(1);
  });
});
