import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { deletionDetail, deletionRow, traceGroup } from '../mocks/account-deletions.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return {
    ...actual,
    useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }),
  };
});

import AccountDeletionsPage from '../../src/pages/account-deletions';
import { useDeletionDetail } from '../../src/pages/account-deletions/useDeletionDetail';
import type { DeletionDetail } from '../../src/pages/account-deletions/queries';

const seedDetail = (detail: DeletionDetail) => {
  ops.q.AccountDeletionRequest = { data: { accountDeletionRequest: detail } };
};

beforeEach(() => {
  resetOps();
  ops.tableRows = [deletionRow()];
  seedDetail(deletionDetail());
  ops.q.AccountDeletionSettings = { data: { accountDeletionSettings: { retention_days: 30 } } };
});

const openFirst = async (code = 'DEL-0001') => {
  renderWithProviders(<AccountDeletionsPage />);
  fireEvent.click(await screen.findByText(code));
  return screen.findByRole('dialog');
};

describe('Account deletions queue', () => {
  it('shows the countdown chip for every urgency and the fallbacks for missing fields', async () => {
    ops.tableRows = [
      deletionRow({ id: 'a', request_id: 'DEL-A', days_remaining: 0 }),
      deletionRow({ id: 'b', request_id: 'DEL-B', days_remaining: 2, name: '', phone: '' }),
      deletionRow({ id: 'c', request_id: 'DEL-C', days_remaining: null, status: 'COMPLETED', reason: '' }),
      deletionRow({ id: 'd', request_id: 'DEL-D', days_remaining: 20, status: 'ODD' }),
    ];
    renderWithProviders(<AccountDeletionsPage />);
    await screen.findByText('DEL-A');
    expect(screen.getByText('Due now')).toBeInTheDocument();
    expect(screen.getByText('2 days left')).toBeInTheDocument();
    expect(screen.getByText('20 days left')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No reason given')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('ODD')).toBeInTheDocument();
    // A row with no name or phone falls back to the email in both columns.
    expect(screen.getAllByText('asha@example.test').length).toBeGreaterThanOrEqual(2);
  });

  it('opens the settings dialog and saves a new retention window', async () => {
    renderWithProviders(<AccountDeletionsPage />);
    fireEvent.click(screen.getByTestId('open-deletion-settings'));
    const input = await screen.findByTestId('retention-days');
    await waitFor(() => expect(input).toHaveValue(30));
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.click(screen.getByTestId('save-retention'));
    await waitFor(() =>
      expect(mutation('UpdateAccountDeletionSettings')).toHaveBeenCalledWith({
        variables: { retention_days: 45 },
      })
    );
    expect(ops.notifySuccess).toHaveBeenCalledWith('Deletion window updated.');
  });

  it('rejects an out-of-range retention window without calling the server', async () => {
    renderWithProviders(<AccountDeletionsPage />);
    fireEvent.click(screen.getByTestId('open-deletion-settings'));
    const input = await screen.findByTestId('retention-days');
    fireEvent.change(input, { target: { value: '400' } });
    fireEvent.click(screen.getByTestId('save-retention'));
    expect(
      await screen.findByText('Enter a whole number of days between 1 and 365.')
    ).toBeInTheDocument();
    expect(mutation('UpdateAccountDeletionSettings')).not.toHaveBeenCalled();
  });

  it('treats a missing server value as zero and refuses it, reporting a non-Error failure as text', async () => {
    ops.q.AccountDeletionSettings = {};
    ops.mut.UpdateAccountDeletionSettings = vi.fn().mockRejectedValue('plain text');
    renderWithProviders(<AccountDeletionsPage />);
    fireEvent.click(screen.getByTestId('open-deletion-settings'));
    fireEvent.click(await screen.findByTestId('save-retention'));
    expect(
      await screen.findByText('Enter a whole number of days between 1 and 365.')
    ).toBeInTheDocument();
    expect(mutation('UpdateAccountDeletionSettings')).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('retention-days'), { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('save-retention'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('plain text'));
  });

  it('reports a failed settings save', async () => {
    ops.mut.UpdateAccountDeletionSettings = vi.fn().mockRejectedValue(new Error('locked'));
    renderWithProviders(<AccountDeletionsPage />);
    fireEvent.click(screen.getByTestId('open-deletion-settings'));
    fireEvent.click(await screen.findByTestId('save-retention'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('locked'));
  });
});

describe('Account deletion detail', () => {
  it('lists where the member appears with each effect and enables the row actions', async () => {
    seedDetail(
      deletionDetail(
        { purge_log: [{ model_name: 'Old', collection_name: 'olds', field_path: 'user', removed: 3, purged_at: 'x' }] },
        {
          trace: [
            traceGroup(),
            traceGroup({ model_name: 'Pod', collection_name: 'pods', field_path: 'attendees', purge_kind: 'REMOVE_FROM_DOCUMENTS' }),
            traceGroup({
              model_name: 'Payment',
              collection_name: 'payments',
              field_path: 'payer',
              purge_kind: 'REDACT_RECORDS',
              retention_reason: 'Tax law',
            }),
          ],
        }
      )
    );
    const dialog = await openFirst();
    expect(await within(dialog).findByText('Deletion request DEL-0001')).toBeInTheDocument();
    expect(within(dialog).getByText('Deletes the records')).toBeInTheDocument();
    expect(within(dialog).getByText('Removes them from the records')).toBeInTheDocument();
    expect(within(dialog).getByText('Keeps the record, erases the person').closest('[title]')).toHaveAttribute('title', 'Tax law');
    expect(within(dialog).getByTestId('purge-Payment.payer')).toHaveTextContent('Erase details');
    expect(within(dialog).getByTestId('purge-ChatMessage.sender')).toHaveTextContent('Delete');
    expect(within(dialog).getByText('3 from olds (user)')).toBeInTheDocument();
    expect(within(dialog).getByText('The account document is still here.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Deletes .* · 12 days left/)).toBeInTheDocument();
  });

  it('uses the default hint for a redacted group with no stated reason', async () => {
    seedDetail(
      deletionDetail({}, { trace: [traceGroup({ purge_kind: 'REDACT_RECORDS', retention_reason: '' })] })
    );
    const dialog = await openFirst();
    expect((await within(dialog).findByText('Keeps the record, erases the person')).closest('[title]')).toHaveAttribute(
      'title',
      expect.stringContaining('has to outlive the account')
    );
  });

  it('deletes one group after confirmation', async () => {
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('purge-ChatMessage.sender'));
    const confirm = await screen.findByText('Delete from chat_messages?');
    expect(confirm).toBeInTheDocument();
    expect(screen.getByText('This affects 7 record(s) in chat_messages. It cannot be undone.')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() =>
      expect(mutation('PurgeAccountTrace')).toHaveBeenCalledWith({
        variables: {
          input: { request_doc_id: 'r1', model_name: 'ChatMessage', field_path: 'sender' },
        },
      })
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Done'));
  });

  it('cancelling the group confirmation sends nothing', async () => {
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('purge-ChatMessage.sender'));
    const title = await screen.findByText('Delete from chat_messages?');
    const confirm = title.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(confirm).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText('Delete from chat_messages?')).not.toBeInTheDocument());
    expect(mutation('PurgeAccountTrace')).not.toHaveBeenCalled();
  });

  it('surfaces a failed single-group delete', async () => {
    ops.mut.PurgeAccountTrace = vi.fn().mockRejectedValue(new Error('db down'));
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('purge-ChatMessage.sender'));
    await screen.findByText('Delete from chat_messages?');
    const buttons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('db down'));
    expect(ops.notifySuccess).not.toHaveBeenCalled();
  });

  it('shows a closed request as a record: no actions, empty trace, removed account', async () => {
    ops.tableRows = [deletionRow({ status: 'COMPLETED', days_remaining: null })];
    seedDetail(
      deletionDetail({ status: 'COMPLETED', days_remaining: null }, { account_exists: false, trace: [] })
    );
    const dialog = await openFirst();
    expect(await within(dialog).findByText('Nothing left. Only the account document remains.')).toBeInTheDocument();
    expect(within(dialog).getByText('The account document has been removed.')).toBeInTheDocument();
    expect(within(dialog).queryByTestId('open-purge-all')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Reject request' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/days left/)).not.toBeInTheDocument();
  });

  it('keeps trace deletes disabled when the request is not pending', async () => {
    ops.tableRows = [deletionRow({ status: 'REJECTED', days_remaining: null })];
    seedDetail(deletionDetail({ status: 'REJECTED', days_remaining: null }));
    const dialog = await openFirst();
    expect(await within(dialog).findByTestId('purge-ChatMessage.sender')).toBeDisabled();
  });

  it('falls back to the email and the no-reason copy in the summary', async () => {
    seedDetail(deletionDetail({ name: '', phone: '', reason: '', days_remaining: 1 }));
    const dialog = await openFirst();
    expect(await within(dialog).findByText('No reason given')).toBeInTheDocument();
    expect(within(dialog).getAllByText('asha@example.test').length).toBeGreaterThan(0);
  });

  it('shows a progress bar while the detail loads and no summary yet', async () => {
    ops.q.AccountDeletionRequest = { loading: true };
    const dialog = await openFirst();
    expect(await within(dialog).findByRole('progressbar')).toBeInTheDocument();
    expect(within(dialog).queryByTestId('open-purge-all')).not.toBeInTheDocument();
  });

  it('falls back to a neutral chip for a status it does not know', async () => {
    seedDetail(deletionDetail({ status: 'ARCHIVED' }));
    const dialog = await openFirst();
    expect(await within(dialog).findByText('ARCHIVED')).toBeInTheDocument();
  });

  it('labels a redact action as in flight while it runs and sends it once', async () => {
    seedDetail(
      deletionDetail({}, { trace: [traceGroup({ model_name: 'Payment', collection_name: 'payments', field_path: 'payer', purge_kind: 'REDACT_RECORDS' })] })
    );
    let release: () => void = () => undefined;
    mutation('PurgeAccountTrace').mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ data: {} }); })
    );
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('purge-Payment.payer'));
    await screen.findByText('Delete from payments?');
    const buttons = screen.getAllByRole('button', { name: 'Delete' });
    const confirm = buttons[buttons.length - 1];
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(await within(dialog).findByText('Erasing…')).toBeInTheDocument();
    expect(within(dialog).getByTestId('open-purge-all')).toBeDisabled();
    release();
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Done'));
    expect(mutation('PurgeAccountTrace')).toHaveBeenCalledTimes(1);
  });

  it('labels a delete action as in flight while it runs', async () => {
    let release: () => void = () => undefined;
    mutation('PurgeAccountTrace').mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ data: {} }); })
    );
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('purge-ChatMessage.sender'));
    await screen.findByText('Delete from chat_messages?');
    const buttons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(await within(dialog).findByText('Deleting…')).toBeInTheDocument();
    release();
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Done'));
  });

  it('closes from the footer button', async () => {
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Rejecting a request', () => {
  const openReject = async () => {
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Reject request' }));
    const rejectDialog = (await screen.findByText('Reject this request?')).closest('[role="dialog"]') as HTMLElement;
    return rejectDialog;
  };

  it('requires a note, then sends it trimmed and closes both dialogs', async () => {
    const rejectDialog = await openReject();
    const submit = within(rejectDialog).getByRole('button', { name: 'Reject request' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(rejectDialog).getByLabelText('Reason'), { target: { value: '   ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(within(rejectDialog).getByLabelText('Reason'), { target: { value: '  Wrong account  ' } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mutation('RejectAccountDeletionRequest')).toHaveBeenCalledWith({
        variables: { request_doc_id: 'r1', note: 'Wrong account' },
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('stays open and reports when the server refuses', async () => {
    ops.mut.RejectAccountDeletionRequest = vi.fn().mockRejectedValue(new Error('not allowed'));
    const rejectDialog = await openReject();
    fireEvent.change(within(rejectDialog).getByLabelText('Reason'), { target: { value: 'No' } });
    fireEvent.click(within(rejectDialog).getByRole('button', { name: 'Reject request' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('not allowed'));
    expect(screen.getByText('Reject this request?')).toBeInTheDocument();
  });

  it('cancel clears the note and closes without calling the server', async () => {
    const rejectDialog = await openReject();
    fireEvent.change(within(rejectDialog).getByLabelText('Reason'), { target: { value: 'typed' } });
    fireEvent.click(within(rejectDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Reject this request?')).not.toBeInTheDocument());
    expect(mutation('RejectAccountDeletionRequest')).not.toHaveBeenCalled();
  });
});

describe('Delete everything run', () => {
  const twoGroups = () =>
    seedDetail(
      deletionDetail(
        {},
        {
          trace: [
            traceGroup(),
            traceGroup({ model_name: 'Payment', collection_name: 'payments', field_path: 'payer', purge_kind: 'REDACT_RECORDS' }),
          ],
        }
      )
    );

  const openRun = async () => {
    const dialog = await openFirst();
    fireEvent.click(await within(dialog).findByTestId('open-purge-all'));
    const runDialog = (await screen.findByText('Delete everything for Asha Rao?')).closest('[role="dialog"]') as HTMLElement;
    return runDialog;
  };

  it('keeps the confirm disabled until the reference is typed back, then runs every step', async () => {
    twoGroups();
    mutation('PurgeAccountTrace').mockImplementation(async (opts: { variables: { input: { field_path: string } } }) => ({
      data: {
        purgeAccountTrace: deletionDetail({
          purge_log: [{ model_name: 'M', collection_name: 'c', field_path: opts.variables.input.field_path, removed: 5, purged_at: 'x' }],
        }),
      },
    }));
    const runDialog = await openRun();
    const go = within(runDialog).getByTestId('purge-all-confirm');
    expect(go).toBeDisabled();
    const input = within(runDialog).getByTestId('purge-all-confirm-input');
    fireEvent.change(input, { target: { value: 'del-9999' } });
    expect(go).toBeDisabled();
    fireEvent.change(input, { target: { value: ' del-0001 ' } });
    expect(go).toBeEnabled();
    fireEvent.click(go);

    expect(await screen.findByText('Carrying out DEL-0001')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('3 of 3 done')).toBeInTheDocument());
    expect(mutation('PurgeAccountTrace')).toHaveBeenCalledTimes(2);
    expect(mutation('PurgeAccountCompletely')).toHaveBeenCalledWith({ variables: { request_doc_id: 'r1' } });
    expect(screen.getByText('5 removed')).toBeInTheDocument();
    expect(screen.getByText('5 redacted')).toBeInTheDocument();
    expect(screen.getByText('The account itself')).toBeInTheDocument();
    expect(ops.notifySuccess).toHaveBeenCalledWith('The account document has been removed.');

    // Closing a finished run closes the request with it.
    const run = screen.getByText('Carrying out DEL-0001').closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(run).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('marks the step that failed and keeps the earlier ones done', async () => {
    twoGroups();
    mutation('PurgeAccountTrace')
      .mockResolvedValueOnce({ data: { purgeAccountTrace: deletionDetail() } })
      .mockRejectedValueOnce('boom');
    const runDialog = await openRun();
    fireEvent.change(within(runDialog).getByTestId('purge-all-confirm-input'), { target: { value: 'DEL-0001' } });
    fireEvent.click(within(runDialog).getByTestId('purge-all-confirm'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('boom'));
    expect(await screen.findByText('1 of 3 done')).toBeInTheDocument();
    expect(mutation('PurgeAccountCompletely')).not.toHaveBeenCalled();
    expect(ops.notifySuccess).not.toHaveBeenCalled();
  });

  it('closing before starting leaves the request open', async () => {
    const runDialog = await openRun();
    fireEvent.change(within(runDialog).getByTestId('purge-all-confirm-input'), { target: { value: 'abc' } });
    fireEvent.click(within(runDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Delete everything for Asha Rao?')).not.toBeInTheDocument());
    expect(screen.getByText('Deletion request DEL-0001')).toBeInTheDocument();
    expect(mutation('PurgeAccountCompletely')).not.toHaveBeenCalled();
  });
});

describe('useDeletionDetail without a request', () => {
  it('does nothing and reports failure when there is no request to act on', async () => {
    const { result } = renderHook(() => useDeletionDetail(null, vi.fn()));
    await result.current.deleteGroup(traceGroup());
    expect(await result.current.deleteEverything()).toBe(false);
    expect(await result.current.rejectRequest('note')).toBe(false);
    expect(mutation('PurgeAccountTrace')).not.toHaveBeenCalled();
    expect(mutation('PurgeAccountCompletely')).not.toHaveBeenCalled();
    expect(mutation('RejectAccountDeletionRequest')).not.toHaveBeenCalled();
  });

  it('runs only the closing step when the detail has not loaded', async () => {
    delete ops.q.AccountDeletionRequest;
    const { result } = renderHook(() => useDeletionDetail('r1', vi.fn()));
    expect(result.current.detail).toBeNull();
    let ok = false;
    await act(async () => {
      ok = await result.current.deleteEverything();
    });
    expect(ok).toBe(true);
    expect(mutation('PurgeAccountTrace')).not.toHaveBeenCalled();
    expect(mutation('PurgeAccountCompletely')).toHaveBeenCalledWith({ variables: { request_doc_id: 'r1' } });
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.steps[0]).toMatchObject({ key: '__account__', status: 'DONE' });
  });

  it('reads zero removed when the server returns no log', async () => {
    seedDetail(deletionDetail());
    mutation('PurgeAccountTrace').mockResolvedValue({ data: { purgeAccountTrace: null } });
    const onChanged = vi.fn();
    const { result } = renderHook(() => useDeletionDetail('r1', onChanged));
    let ok = false;
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      ok = await result.current.deleteEverything();
    });
    expect(ok).toBe(true);
    expect(result.current.steps[0]).toMatchObject({ status: 'DONE', removed: 0, expected: 7 });
    expect(onChanged).toHaveBeenCalled();
  });
});
