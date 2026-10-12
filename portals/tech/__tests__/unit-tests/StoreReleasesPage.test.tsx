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

describe('Store releases page', () => {
  it('lists App Store releases with the rejection chip and opens the store console link', async () => {
    mount();
    expect(await screen.findByText('Read from Duncit at', { exact: false })).toBeInTheDocument();
    const row = (await screen.findByText('2.4.0')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getAllByText('Rejected').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Open in store console/ })).toHaveAttribute(
      'href',
      'https://store.example.test/console',
    );
  });

  it('shows the not-connected warning and routes to settings', async () => {
    seed(releasePage({ configured: false, rows: [], store_url: '' }));
    mount();
    expect(await screen.findByText('Not connected yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(await screen.findByText('build settings')).toBeInTheDocument();
  });

  it('surfaces a store read failure and the query error', async () => {
    seed(releasePage({ error: 'JWT expired' }));
    mount();
    expect(await screen.findByText('The store could not be read: JWT expired')).toBeInTheDocument();
  });

  it('shows the query error instead of the panel', async () => {
    ops.q.StoreReleases = { error: new Error('releases offline') };
    mount();
    expect(await screen.findByText('releases offline')).toBeInTheDocument();
  });

  it('switches to Google Play with its track, rollout and no-review-api note', async () => {
    seed(
      releasePage({
        store: 'GOOGLE_PLAY',
        rows: [releaseRow({ id: 'p1', store: 'GOOGLE_PLAY', status: 'ROLLING_OUT', state: 'inProgress', track: 'production', rollout_pct: 20, issue: null })],
      }),
    );
    mount();
    fireEvent.click(await screen.findByTestId('releases-tab-play'));
    expect(await screen.findByText('production · 20%')).toBeInTheDocument();
    expect(screen.getByText('Rolling out', { exact: false })).toBeInTheDocument();
  });
});

describe('Release actions', () => {
  it('submits the latest build only after confirmation', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.SubmitLatestBuildToStore = vi
      .fn()
      .mockResolvedValue({ data: { submitLatestBuildToStore: { build_no: 'B-101', version: '2.5.0' } } });
    mount();
    const submit = await screen.findByRole('button', { name: 'Submit latest build' });
    fireEvent.click(submit);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].title).toBe('Submit the latest build to App Store?');
    expect(mutation('SubmitLatestBuildToStore')).not.toHaveBeenCalled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mutation('SubmitLatestBuildToStore')).toHaveBeenCalledWith({ variables: { store: 'APP_STORE' } }),
    );
    expect(ops.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('B-101'));
  });

  it('reports a failed submit', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SubmitLatestBuildToStore = vi.fn().mockRejectedValue(new Error('no build ready'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Submit latest build' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
    expect(String(ops.notifyError.mock.calls[0][0])).toContain('no build ready');
  });

  it('logs a manual rejection from the toolbar and closes on success', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Log rejection' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log and advise' }));
    expect(await within(dialog).findByText('Name the version that was rejected.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Version/), { target: { value: '2.5.0' } });
    fireEvent.change(within(dialog).getByLabelText(/What the reviewer said/), {
      target: { value: 'Guideline 2.1 - app crashed on launch' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log and advise' }));
    await waitFor(() => expect(mutation('LogStoreRejection')).toHaveBeenCalled());
    expect(mutation('LogStoreRejection').mock.calls[0][0].variables.input).toMatchObject({
      store: 'APP_STORE',
      version: '2.5.0',
      reviewer_message: 'Guideline 2.1 - app crashed on launch',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the log dialog open when logging fails', async () => {
    ops.mut.LogStoreRejection = vi.fn().mockRejectedValue(new Error('duplicate'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Log rejection' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Version/), { target: { value: '2.5.0' } });
    fireEvent.change(within(dialog).getByLabelText(/What the reviewer said/), {
      target: { value: 'Guideline 2.1 - app crashed on launch' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log and advise' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
