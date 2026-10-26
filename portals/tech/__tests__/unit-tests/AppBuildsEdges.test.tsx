import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mutation, ops, resetOps } from '../mocks/ops';
import { appBuild, appStoreRelease } from '../mocks/app-builds.mock';

const saveFile = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/utils', async (io) => ({
  ...(await io<typeof import('@duncit/utils')>()),
  downloadBase64File: saveFile,
}));

import AppStoreReleases from '../../src/pages/app-builds/AppStoreReleases';
import BuildDetailsDialog from '../../src/pages/app-builds/BuildDetailsDialog';
import IosSigningFiles from '../../src/pages/app-builds/IosSigningFiles';
import ReleaseLogDialog from '../../src/pages/app-builds/ReleaseLogDialog';
import { releaseWhen } from '../../src/pages/app-builds/StoreReleases';

beforeEach(() => {
  resetOps();
  saveFile.mockReset();
});

describe('AppStoreReleases', () => {
  it('shows a push that is still going, with its stage', () => {
    render(
      <AppStoreReleases
        build={appBuild({
          platform: 'IOS',
          app_store_releases: [appStoreRelease({ status: 'PUSHING', stage: 'Uploading to App Store Connect', finished_at: null })],
        })}
      />,
    );
    expect(screen.getByText('Pushing')).toBeInTheDocument();
    expect(screen.getByText('Uploading to App Store Connect')).toBeInTheDocument();
  });

  it('shows a released push, a failed one with its reason, and a push with no build id or stage', () => {
    render(
      <AppStoreReleases
        build={appBuild({
          platform: 'IOS',
          app_store_releases: [
            appStoreRelease({ track: 'TESTFLIGHT', status: 'RELEASED' }),
            appStoreRelease({
              track: 'APP_STORE',
              status: 'FAILED',
              asc_build_id: '',
              stage: '',
              error: 'Missing compliance',
              started_at: '2026-01-02T10:10:00.000Z',
              finished_at: null,
            }),
          ],
        })}
      />,
    );
    expect(screen.getByText('Missing compliance')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getAllByText(/asc-1/)).toHaveLength(1);
  });

  it('says nothing was pushed yet', () => {
    render(<AppStoreReleases build={appBuild({ platform: 'IOS', app_store_releases: [] })} />);
    expect(screen.getByTestId('app-builds-app-store-releases')).toBeInTheDocument();
    expect(screen.queryByText('Pushing')).not.toBeInTheDocument();
  });
});

describe('releaseWhen', () => {
  it('uses the finish time, and the start while the push has not finished', () => {
    const started = releaseWhen({ started_at: '2026-01-01T10:00:00.000Z', finished_at: null });
    const finished = releaseWhen({ started_at: '2026-01-01T10:00:00.000Z', finished_at: '2026-01-01T11:30:00.000Z' });

    expect(started).not.toBe(finished);
  });
});

describe('BuildDetailsDialog / a file that never stored', () => {
  it('says the file is missing when the runner gave no reason', () => {
    const build = appBuild({
      artifacts: [{ kind: 'APK', name: 'app.apk', url: '', file_id: '', size_mb: null, error: '' }],
    });
    render(<BuildDetailsDialog build={build} onClose={vi.fn()} />);

    expect(screen.getByText('app.apk')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'APK' })).not.toBeInTheDocument();
  });
});

describe('ReleaseLogDialog', () => {
  const failed = {
    error: 'Upload rejected',
    by: 'ops@example.test',
    started_at: '2026-01-01T10:00:00.000Z',
    finished_at: '2026-01-01T10:05:00.000Z',
    log: ['10:00 start', '10:01 upload failed'],
  };

  const show = (release: Parameters<typeof ReleaseLogDialog>[0]['release']) =>
    render(<ReleaseLogDialog open subject="DUN-BLD-1 · Internal" release={release} onClose={vi.fn()} />);

  it('shows the reason, who ran it and each step in order', () => {
    show(failed);

    expect(screen.getByTestId('release-log-error')).toHaveTextContent('Upload rejected');
    expect(screen.getByTestId('release-log-lines')).toHaveTextContent('10:00 start10:01 upload failed');
    expect(screen.queryByTestId('release-log-empty')).not.toBeInTheDocument();
    expect(screen.getByText(/ops@example\.test/)).toBeInTheDocument();
  });

  it('says so when no reason or step log was kept, and names no one for an anonymous push', () => {
    show({ error: '', started_at: '2026-01-01T10:00:00.000Z', finished_at: null });

    expect(screen.getByTestId('release-log-error')).toHaveTextContent('The store gave no reason.');
    expect(screen.getByTestId('release-log-error')).not.toHaveTextContent('Upload rejected');
    expect(screen.getByTestId('release-log-empty')).toBeInTheDocument();
    expect(screen.queryByText(/ops@example\.test/)).not.toBeInTheDocument();
  });

  it('keeps a repeated step line as two entries', () => {
    show({ ...failed, log: ['retry part 3', 'retry part 3'] });
    expect(screen.getByTestId('release-log-lines').children).toHaveLength(2);
  });
});

describe('IosSigningFiles', () => {
  const signing = {
    __typename: 'IosSigning',
    id: 'sign1',
    certificate_serial: 'ABC123',
    expires_at: '2027-01-01T00:00:00.000Z',
  };
  const file = (over: Record<string, unknown> = {}) => ({
    downloadIosSigningFile: { file_name: 'cert.cer', content_base64: 'Zm9v', password: null, ...over },
  });

  beforeEach(() => {
    ops.q = { IosSigningForBuild: { data: { iosSigningForBuild: signing } } };
  });

  it('says there are no signing files for a build that was not signed here', () => {
    ops.q = { IosSigningForBuild: { data: { iosSigningForBuild: null } } };
    render(<IosSigningFiles buildId="b1" />);
    expect(screen.getByText('This build was not signed with signing files from this server.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says nothing about missing files while they are still loading', () => {
    ops.q = { IosSigningForBuild: { loading: true } };
    render(<IosSigningFiles buildId="b1" />);
    expect(screen.queryByText('This build was not signed with signing files from this server.')).not.toBeInTheDocument();
  });

  it('downloads a signing file and offers no password for one that has none', async () => {
    ops.mut.DownloadIosSigningFile = vi.fn().mockResolvedValue({ data: file() });
    render(<IosSigningFiles buildId="b1" />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith('Zm9v', 'cert.cer', 'application/octet-stream'));
    expect(mutation('DownloadIosSigningFile')).toHaveBeenCalledWith({ variables: { id: 'sign1', kind: 'CERTIFICATE' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the one-time password of a sealed .p12 after it is saved', async () => {
    ops.mut.DownloadIosSigningFile = vi.fn().mockResolvedValue({
      data: file({ file_name: 'signing.p12', password: 'hunter2' }),
    });
    render(<IosSigningFiles buildId="b1" />);

    fireEvent.click(screen.getAllByRole('button')[2]);

    expect(await screen.findByRole('alert')).toHaveTextContent('hunter2');
    expect(screen.getByRole('alert')).toHaveTextContent('signing.p12');
  });

  it('saves nothing when the server answers with no file', async () => {
    ops.mut.DownloadIosSigningFile = vi.fn().mockResolvedValue({ data: undefined });
    render(<IosSigningFiles buildId="b1" />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(ops.mut.DownloadIosSigningFile).toHaveBeenCalled());
    expect(saveFile).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button')[0]).toBeEnabled();
  });

  it('reports a failed download and frees the buttons', async () => {
    ops.mut.DownloadIosSigningFile = vi.fn().mockRejectedValue(new Error('Not allowed'));
    render(<IosSigningFiles buildId="b1" />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('Not allowed'));
    expect(screen.getAllByRole('button')[1]).toBeEnabled();
  });

  it('shows a dash for a certificate with no expiry date', () => {
    ops.q = { IosSigningForBuild: { data: { iosSigningForBuild: { ...signing, expires_at: null } } } };
    render(<IosSigningFiles buildId="b1" />);
    expect(screen.getByText(/ABC123/)).toHaveTextContent('—');
  });
});
