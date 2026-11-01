import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  cancelMarketingRunErrorMock,
  cancelMarketingRunMock,
  decideMarketingRunErrorMock,
  decideMarketingRunMock,
  makeRunState,
  retryMarketingRunErrorMock,
  retryMarketingRunMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

import RunActions from '../../src/pages/activity-page/RunActions';

afterEach(() => {
  vi.clearAllMocks();
});

describe('RunActions', () => {
  it('offers nothing for a finished run that cannot be run again', () => {
    renderWithProviders(<RunActions run={makeRunState()} onChanged={vi.fn()} />);
    expect(screen.queryByTestId('marketing-run-actions')).not.toBeInTheDocument();
  });

  it('retries a failed run and reports it', async () => {
    const onChanged = vi.fn();
    const run = makeRunState({ status: 'FAILED', can_retry: true });
    renderWithProviders(<RunActions run={run} onChanged={onChanged} />, {
      mocks: [retryMarketingRunMock(makeRunState({ status: 'PENDING' }))],
    });
    const actions = screen.getByTestId('marketing-run-actions');
    expect(within(actions).queryByRole('button', { name: 'Cancel run' })).not.toBeInTheDocument();
    expect(within(actions).queryByTestId('marketing-run-decide')).not.toBeInTheDocument();
    fireEvent.click(within(actions).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The run is queued to try again.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports a retry the server refused, and leaves the grid alone', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<RunActions run={makeRunState({ status: 'PARTIAL', can_retry: true })} onChanged={onChanged} />, {
      mocks: [retryMarketingRunErrorMock('run1', 'Workflow cannot run again')],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Workflow cannot run again', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('asks before cancelling a running run, and does nothing when the person backs out', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    const cancel = cancelMarketingRunMock(makeRunState({ status: 'CANCELLED' }));
    const resultFn = vi.fn(() => cancel.result as { data: Record<string, unknown> });
    renderWithProviders(<RunActions run={makeRunState({ status: 'RUNNING' })} onChanged={vi.fn()} />, {
      mocks: [{ ...cancel, result: resultFn }],
    });
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalledTimes(1));
    expect(dialogsMock.confirm).toHaveBeenCalledWith({
      title: 'Cancel this run?',
      message: 'If it has not started it stops now. If it is running it stops after the current step.',
      confirmLabel: 'Cancel run',
      destructive: true,
    });
    expect(resultFn).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('cancels a queued run once confirmed', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const onChanged = vi.fn();
    renderWithProviders(<RunActions run={makeRunState({ status: 'PENDING' })} onChanged={onChanged} />, {
      mocks: [cancelMarketingRunMock(makeRunState({ status: 'CANCELLED' }))],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The run was cancelled.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports a cancel the server refused', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderWithProviders(<RunActions run={makeRunState({ status: 'RUNNING' })} onChanged={vi.fn()} />, {
      mocks: [cancelMarketingRunErrorMock('run1', 'Already finished')],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Already finished', 'error'));
  });

  it('will not offer cancel twice while one is still landing', () => {
    renderWithProviders(<RunActions run={makeRunState({ status: 'RUNNING', cancel_requested: true })} onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel run' })).toBeDisabled();
  });

  it('approves a waiting run without a note', async () => {
    const onChanged = vi.fn();
    const waiting = makeRunState({ status: 'AWAITING_APPROVAL' });
    renderWithProviders(<RunActions run={waiting} onChanged={onChanged} />, {
      mocks: [decideMarketingRunMock(makeRunState({ status: 'RUNNING' }), 'APPROVED', null)],
    });
    const decide = screen.getByTestId('marketing-run-decide');
    expect(within(decide).getByRole('heading', { level: 3, name: 'Your decision' })).toBeInTheDocument();
    expect(within(decide).getByText('Optional when approving. The requester sees it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel run' })).toBeEnabled();
    fireEvent.click(within(decide).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Decision saved.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('insists on a note before rejecting or asking for changes, then sends it trimmed', async () => {
    const onChanged = vi.fn();
    const reject = decideMarketingRunMock(makeRunState({ status: 'CANCELLED' }), 'REJECTED', 'Too early for this');
    const resultFn = vi.fn(() => reject.result as { data: Record<string, unknown> });
    renderWithProviders(<RunActions run={makeRunState({ status: 'AWAITING_APPROVAL' })} onChanged={onChanged} />, {
      mocks: [{ ...reject, result: resultFn }],
    });
    const decide = screen.getByTestId('marketing-run-decide');
    const note = within(decide).getByRole('textbox', { name: 'Note' });

    fireEvent.click(within(decide).getByRole('button', { name: 'Request changes' }));
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(within(decide).getByText('Add a note so the requester knows why.')).toBeInTheDocument();
    expect(resultFn).not.toHaveBeenCalled();

    // Spaces are not a note.
    fireEvent.change(note, { target: { value: '   ' } });
    expect(note).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(within(decide).getByRole('button', { name: 'Reject' }));
    expect(resultFn).not.toHaveBeenCalled();

    fireEvent.change(note, { target: { value: '  Too early for this  ' } });
    expect(note).toHaveAttribute('aria-invalid', 'false');
    expect(within(decide).getByText('Optional when approving. The requester sees it.')).toBeInTheDocument();
    fireEvent.click(within(decide).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(resultFn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Decision saved.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports a decision the server refused', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<RunActions run={makeRunState({ status: 'AWAITING_APPROVAL' })} onChanged={onChanged} />, {
      mocks: [decideMarketingRunErrorMock('run1', 'CHANGES_REQUESTED', 'Crop it', 'Someone already decided')],
    });
    const decide = screen.getByTestId('marketing-run-decide');
    fireEvent.change(within(decide).getByRole('textbox', { name: 'Note' }), { target: { value: 'Crop it' } });
    fireEvent.click(within(decide).getByRole('button', { name: 'Request changes' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Someone already decided', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
