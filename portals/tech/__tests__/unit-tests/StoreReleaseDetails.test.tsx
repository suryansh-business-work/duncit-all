import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { releaseAdvice, releaseIssue, releasePage, releaseRow } from '../mocks/releases.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import ReleasesPage from '../../src/pages/app-builds/releases';

const mount = (entry = '/releases') =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/releases" element={<ReleasesPage />} />
        <Route path="/app-builds/settings" element={<p>build settings</p>} />
      </>
    ),
  });

const seed = (page = releasePage()) => {
  ops.q = { StoreReleases: { data: { storeReleases: page } } };
};

const openRow = async (version = '2.4.0') => {
  const cell = await screen.findByText(version);
  fireEvent.click(cell.closest('[role="row"]') as HTMLElement);
  return screen.findByRole('dialog');
};

beforeEach(() => {
  resetOps();
  seed();
});

describe('Release details dialog', () => {
  it('shows the issue facts, advice and resolves the open issue after confirmation', async () => {
    ops.confirm.mockResolvedValue(true);
    mount();
    const dialog = await openRow();
    expect(within(dialog).getByTestId('release-issue-banner')).toBeInTheDocument();
    expect(within(dialog).getByTestId('release-advice')).toHaveTextContent('Add a demo account for the reviewer');
    expect(within(dialog).getByText('High confidence')).toBeInTheDocument();
    expect(within(dialog).getByText(/Mail and Slack sent/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));
    await waitFor(() => expect(mutation('ResolveStoreIssue')).toHaveBeenCalledWith({ variables: { id: 'iss1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Issue marked resolved.');
  });

  it('saves an edited reviewer message and rejects a too-short one', async () => {
    mount();
    const dialog = await openRow();
    const box = within(dialog).getByLabelText(/What the reviewer said/);
    fireEvent.change(box, { target: { value: 'short' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save and write the advice again' }));
    expect(await within(dialog).findByText(/Paste at least 10 characters/)).toBeInTheDocument();
    expect(mutation('SetStoreIssueReviewerMessage')).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: 'Your login screen shows a blank page' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save and write the advice again' }));
    await waitFor(() =>
      expect(mutation('SetStoreIssueReviewerMessage')).toHaveBeenCalledWith({
        variables: { id: 'iss1', message: 'Your login screen shows a blank page' },
      }),
    );
  });

  it('reports a failed resolve and a failed message save', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.ResolveStoreIssue = vi.fn().mockRejectedValue(new Error('already closed'));
    ops.mut.SetStoreIssueReviewerMessage = vi.fn().mockRejectedValue(new Error('too large'));
    mount();
    const dialog = await openRow();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));
    await waitFor(() => expect(String(ops.notifyError.mock.calls[0]?.[0])).toContain('already closed'));
    fireEvent.change(within(dialog).getByLabelText(/What the reviewer said/), {
      target: { value: 'Your login screen shows a blank page' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save and write the advice again' }));
    await waitFor(() => expect(String(ops.notifyError.mock.calls.at(-1)?.[0])).toContain('too large'));
  });

  it('shows a closed manual issue with who closed it and the advice error', async () => {
    seed(
      releasePage({
        rows: [
          releaseRow({
            issue: releaseIssue({
              source: 'MANUAL',
              detected_by: 'ops@example.test',
              resolved_at: '2026-01-03T10:00:00.000Z',
              resolved_reason: 'BY:ops@example.test',
              state: 'MANUAL',
              advice: releaseAdvice({ summary: '', error: 'model unavailable' }),
              notify_error: 'slack 500',
              resubmitted_build_no: 'B-120',
              resubmitted_by: 'ops@example.test',
            }),
          }),
        ],
      }),
    );
    mount();
    const dialog = await openRow();
    expect(within(dialog).getByText(/Closed by ops@example.test/)).toBeInTheDocument();
    expect(within(dialog).getByText('model unavailable')).toBeInTheDocument();
    expect(within(dialog).getByText('Sending failed: slack 500')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument();
  });

  it('offers to log a rejection for a release without an issue', async () => {
    seed(releasePage({ rows: [releaseRow({ issue: null, status: 'LIVE', state: 'READY_FOR_SALE' })] }));
    mount();
    const dialog = await openRow();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log rejection' }));
    const logDialog = await screen.findByRole('dialog', { name: /Log/ });
    expect(within(logDialog).getByLabelText(/^Version/)).toHaveValue('2.4.0');
  });

  it('shows pending advice for an issue the store just raised', async () => {
    seed(releasePage({ rows: [releaseRow({ issue: releaseIssue({ advice: null }) })] }));
    mount();
    const dialog = await openRow();
    expect(within(dialog).getByText(/advice is being written/)).toBeInTheDocument();
  });
});
