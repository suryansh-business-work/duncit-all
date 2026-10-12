import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild, appStoreRelease, playRelease } from '../mocks/app-builds.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import AppBuildsPage from '../../src/pages/app-builds';

beforeEach(() => {
  resetOps();
  ops.tableRows = [appBuild()];
  ops.q = {
    AppBuildTriggerConfig: {
      data: {
        appBuildTriggerConfig: {
          configured: true,
          repository: 'org/repo',
          production_ref: 'main',
          staging_ref: 'staging',
          reports_to: 'https://api.example.test',
        },
      },
    },
  };
});

const mount = async (platform: 'ANDROID' | 'IOS' = 'ANDROID', first = 'duncit-2.4.0.apk') => {
  renderWithProviders(<AppBuildsPage platform={platform} />);
  return (await screen.findByText(first)).closest('[role="row"]') as HTMLElement;
};

describe('App builds table', () => {
  it('shows a build with its status, env, trigger and Slack outcome', async () => {
    const row = await mount();
    expect(within(row).getByText('Success')).toBeInTheDocument();
    expect(row.querySelector('[col-id="app_env"]')).toHaveTextContent('Production');
    expect(within(row).getByText('Posted')).toBeInTheDocument();
    expect(within(row).getByText('abcdef1')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'View run' })).toHaveAttribute(
      'href',
      'https://github.example.test/runs/9',
    );
    expect(within(row).getByRole('link', { name: 'Download APK' })).toBeInTheDocument();
  });

  it('draws failed, queued-stale and file-less builds distinctly', async () => {
    ops.tableRows = [
      appBuild({ id: 'f', status: 'FAILED', error_message: 'gradle exploded', build_name: 'failed.apk', artifacts: [{ kind: 'APK', name: 'a', url: '', file_id: '', size_mb: null, error: 'upload failed' }], slack_ts: null, slack_error: 'no channel' }),
      appBuild({ id: 's', status: 'RUNNING', build_name: 'stale.apk', created_at: '2020-01-01T00:00:00.000Z', stage: 'Compile' }),
      appBuild({ id: 'r', status: 'RUNNING', build_name: 'live.apk', created_at: new Date().toISOString() }),
    ];
    renderWithProviders(<AppBuildsPage platform="ANDROID" />);
    expect(await screen.findByText('failed.apk')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getAllByText('Building').length).toBe(2);
  });

  it('confirms and deletes a build, and reports a failed delete', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const row = await mount();
    const del = within(row).getByRole('button', { name: 'Delete' });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteAppBuild')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(mutation('DeleteAppBuild')).toHaveBeenCalledWith({ variables: { id: 'b1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Build deleted.');
    mutation('DeleteAppBuild').mockRejectedValueOnce(new Error('build locked'));
    fireEvent.click(del);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('build locked'));
  });
});

describe('Store push cells', () => {
  it('pushes to Google Play after confirming, and marks the destructive production track', async () => {
    ops.confirm.mockResolvedValue(true);
    const row = await mount();
    fireEvent.click(within(row).getByTestId('app-builds-play-production-push'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalled());
    expect(ops.confirm.mock.calls[0][0]).toMatchObject({ destructive: true, title: expect.stringContaining('duncit-2.4.0.apk') });
    await waitFor(() =>
      expect(mutation('PushAppBuildToPlayStore')).toHaveBeenCalledWith({
        variables: { id: 'b1', track: 'PRODUCTION' },
      }),
    );
    expect(ops.notifySuccess).toHaveBeenCalled();
  });

  it('does not push when the confirmation is declined, and reports a failed push', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const row = await mount();
    const internal = within(row).getByTestId('app-builds-play-internal-push');
    fireEvent.click(internal);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('PushAppBuildToPlayStore')).not.toHaveBeenCalled();
    expect(ops.confirm.mock.calls[0][0].destructive).toBe(false);
    mutation('PushAppBuildToPlayStore').mockRejectedValueOnce(new Error('quota'));
    fireEvent.click(internal);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
  });

  it('shows pushed, pushing and failed tracks and opens the failure log', async () => {
    ops.tableRows = [
      appBuild({
        play_releases: [
          playRelease({ track: 'INTERNAL', status: 'RELEASED' }),
          playRelease({ track: 'PRODUCTION', status: 'FAILED', error: 'version code reused', log: ['step 1', 'step 2'] }),
        ],
      }),
    ];
    const row = await mount();
    expect(within(row).getByTestId('app-builds-play-internal-released')).toBeInTheDocument();
    fireEvent.click(within(row).getByTestId('app-builds-play-production-logs'));
    const dialog = await screen.findByTestId('release-log-dialog');
    expect(within(dialog).getByTestId('release-log-error')).toHaveTextContent('version code reused');
    expect(within(dialog).getByTestId('release-log-lines')).toHaveTextContent('step 2');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('release-log-dialog')).not.toBeInTheDocument());
  });

  it('shows an in-flight iOS push, disabled review and TestFlight for a finished build', async () => {
    ops.tableRows = [
      appBuild({
        id: 'i1',
        platform: 'IOS',
        build_no: 'IOS-0050',
        build_name: 'duncit-2.4.0.ipa',
        artifacts: [{ kind: 'IPA', name: 'a.ipa', url: 'https://files.example.test/a.ipa', file_id: 'f', size_mb: 80, error: '' }],
        app_store_releases: [appStoreRelease({ track: 'TESTFLIGHT', status: 'PUSHING', stage: 'Processing' })],
      }),
    ];
    const row = await mount('IOS', 'duncit-2.4.0.ipa');
    expect(within(row).getByTestId('app-builds-app-store-testflight-pushing')).toBeInTheDocument();
    expect(within(row).getByTestId('app-builds-app-store-app_store-push')).toBeDisabled();
  });
});
