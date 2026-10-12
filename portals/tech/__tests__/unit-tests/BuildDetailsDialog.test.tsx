import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild, appStoreRelease, playRelease } from '../mocks/app-builds.mock';

const saveFile = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/utils', async (io) => ({
  ...(await io<typeof import('@duncit/utils')>()),
  downloadBase64File: saveFile,
}));

import BuildDetailsDialog from '../../src/pages/app-builds/BuildDetailsDialog';

beforeEach(() => {
  resetOps();
  saveFile.mockReset();
  ops.q = {};
});

const show = (build: Parameters<typeof BuildDetailsDialog>[0]['build'], onClose = vi.fn()) => {
  render(<BuildDetailsDialog build={build} onClose={onClose} />);
  return onClose;
};

describe('Build details dialog', () => {
  it('renders nothing without a build', () => {
    show(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows facts, progress, artifacts, Play releases and commits for an Android build', () => {
    show(
      appBuild({
        play_releases: [
          playRelease({ track: 'INTERNAL', status: 'RELEASED' }),
          playRelease({ track: 'PRODUCTION', status: 'FAILED', error: 'version code reused', version_code: '' }),
        ],
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('AND-0101')).toBeInTheDocument();
    expect(within(dialog).getByText('2.4.0')).toBeInTheDocument();
    expect(within(dialog).getByText('+20 / -5 (3 files)')).toBeInTheDocument();
    expect(within(dialog).getByText('12m 34s')).toBeInTheDocument();
    expect(within(dialog).getByText('APK 40.2 MB · AAB 30.0 MB')).toBeInTheDocument();
    expect(within(dialog).getByText('Checkout')).toBeInTheDocument();
    expect(within(dialog).getByText('3 min')).toBeInTheDocument();
    expect(within(dialog).getByText('The runner stopped reporting here.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'APK' })).toHaveAttribute('href', 'https://files.example.test/app.apk');
    expect(within(dialog).getByTestId('app-builds-play-releases')).toHaveTextContent('version code reused');
    expect(within(dialog).getByText('Commits (1)')).toBeInTheDocument();
    expect(within(dialog).getByText('abcdef1')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'View run' })).toBeInTheDocument();
  });

  it('shows the failure, a missing artifact reason and no commits', () => {
    show(
      appBuild({
        status: 'FAILED',
        error_message: 'gradle exploded',
        commits: [],
        stages: [],
        workflow_run_url: '',
        slack_ts: null,
        slack_error: 'channel_not_found',
        trigger_source: 'PUSH',
        triggered_by: '',
        app_env: 'STAGING',
        requested_artifacts: [],
        submit_to_play_store: false,
        files_changed: null,
        duration_seconds: null,
        artifacts: [{ kind: 'APK', name: 'app.apk', url: '', file_id: '', size_mb: null, error: 'upload failed' }],
        play_releases: [],
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('gradle exploded')).toBeInTheDocument();
    expect(within(dialog).getByText('upload failed')).toBeInTheDocument();
    expect(within(dialog).getByText('channel_not_found')).toBeInTheDocument();
    expect(within(dialog).getByText('No commit details were recorded for this build.')).toBeInTheDocument();
    expect(within(dialog).getByText('Not pushed to Google Play yet.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'View run' })).not.toBeInTheDocument();
  });

  it('says a queued build has no run link yet and closes on request', () => {
    const onClose = show(appBuild({ status: 'QUEUED', workflow_run_url: '', stages: [], artifacts: [] }));
    expect(screen.getByText(/run/i, { selector: 'span.MuiTypography-caption' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a live build with its current stage spinning and no ended marker', () => {
    show(appBuild({ status: 'RUNNING', created_at: new Date().toISOString() }));
    expect(screen.queryByText('The runner stopped reporting here.')).not.toBeInTheDocument();
  });
});

describe('iOS build details', () => {
  const ios = (over = {}) =>
    appBuild({
      platform: 'IOS',
      build_no: 'IOS-0050',
      artifacts: [],
      app_store_releases: [
        appStoreRelease({ track: 'TESTFLIGHT', status: 'RELEASED' }),
        appStoreRelease({ track: 'APP_STORE', status: 'FAILED', error: 'missing compliance', stage: 'Submitting' }),
      ],
      ...over,
    });
  const signing = {
    id: 'sig1',
    certificate_serial: 'ABC123',
    expires_at: '2027-01-01T00:00:00.000Z',
  };

  it('lists App Store pushes and downloads a signing file', async () => {
    ops.q.IosSigningForBuild = { data: { iosSigningForBuild: signing } };
    ops.mut.DownloadIosSigningFile = vi
      .fn()
      .mockResolvedValue({ data: { downloadIosSigningFile: { file_name: 'cert.cer', content_base64: 'QQ==', password: '' } } });
    show(ios());
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('app-builds-app-store-releases')).toHaveTextContent('missing compliance');
    expect(within(dialog).getByText(/Certificate ABC123/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Certificate (.cer)' }));
    await waitFor(() =>
      expect(mutation('DownloadIosSigningFile')).toHaveBeenCalledWith({ variables: { id: 'sig1', kind: 'CERTIFICATE' } }),
    );
    await waitFor(() => expect(saveFile).toHaveBeenCalledWith('QQ==', 'cert.cer', 'application/octet-stream'));
    expect(within(dialog).queryByText(/Password for/)).not.toBeInTheDocument();
  });

  it('shows the one-time password that comes with a .p12', async () => {
    ops.q.IosSigningForBuild = { data: { iosSigningForBuild: signing } };
    ops.mut.DownloadIosSigningFile = vi.fn().mockResolvedValue({
      data: { downloadIosSigningFile: { file_name: 'cert.p12', content_base64: 'QQ==', password: 'temporary-pass' } },
    });
    show(ios());
    fireEvent.click(screen.getByRole('button', { name: 'Certificate + key (.p12)' }));
    expect(await screen.findByText(/Password for cert.p12: temporary-pass/)).toBeInTheDocument();
  });

  it('reports a failed download and explains a build with no signing files', async () => {
    ops.q.IosSigningForBuild = { data: { iosSigningForBuild: signing } };
    ops.mut.DownloadIosSigningFile = vi.fn().mockRejectedValue(new Error('not allowed'));
    show(ios());
    fireEvent.click(screen.getByRole('button', { name: 'API key (.p8)' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('explains a build that was not signed from this server', () => {
    ops.q.IosSigningForBuild = { data: { iosSigningForBuild: null } };
    show(ios({ app_store_releases: [] }));
    expect(screen.getByText('This build was not signed with signing files from this server.')).toBeInTheDocument();
    expect(screen.getByText('This build has not been pushed to TestFlight or the App Store.')).toBeInTheDocument();
  });
});
