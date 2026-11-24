import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import DownloadAppPage from '@/pages/download-app';
import { CRM_APP_DOWNLOAD, type CrmAppBuild } from '@/api/appDownload.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notifySuccess: notify.success,
  notifyError: notify.error,
}));

const build = (over: Partial<CrmAppBuild> = {}): CrmAppBuild => ({
  build_no: 'DUN-BLD-000120',
  version: '1.0.4',
  build_number: '42',
  apk_url: 'https://server.duncit.com/app-builds/duncit-crm-android-v1.0.4.apk',
  size_mb: 48.25,
  app_env: 'PRODUCTION',
  created_at: '2026-11-24T08:30:00.000Z',
  ...over,
});

const mock = (production: CrmAppBuild | null, staging: CrmAppBuild | null = null) => ({
  request: { query: CRM_APP_DOWNLOAD },
  result: {
    data: {
      crmAppDownload: {
        __typename: 'CrmAppDownload',
        production: production && { __typename: 'CrmAppDownloadBuild', ...production },
        staging: staging && { __typename: 'CrmAppDownloadBuild', ...staging },
      },
    },
  },
});

afterEach(() => vi.clearAllMocks());

describe('DownloadAppPage', () => {
  it('offers the latest production APK with its version, build and size', async () => {
    renderWithApollo(<DownloadAppPage />, [mock(build())]);

    const card = await screen.findByRole('region', { name: 'Latest app' });
    expect(within(card).getByText(/Version 1\.0\.4 · Build 42 · 48\.3 MB/)).toBeInTheDocument();
    const link = within(card).getByRole('link', { name: 'Download APK' });
    expect(link).toHaveAttribute('href', build().apk_url);
    expect(screen.queryByRole('region', { name: 'Staging app' })).toBeNull();
  });

  it('adds the staging APK beside it, labelled for testing', async () => {
    renderWithApollo(<DownloadAppPage />, [mock(build(), build({ version: '1.0.5', app_env: 'STAGING', build_number: null, size_mb: null }))]);

    const staging = await screen.findByRole('region', { name: 'Staging app' });
    expect(within(staging).getByText('Testing only')).toBeInTheDocument();
    expect(within(staging).getByText('Version 1.0.5')).toBeInTheDocument();
  });

  it('says so when no app has been built yet', async () => {
    renderWithApollo(<DownloadAppPage />, [mock(null)]);
    expect(await screen.findByText('No Duncit CRM app has been built for this environment yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download APK' })).toBeNull();
  });

  it('copies the download link and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWithApollo(<DownloadAppPage />, [mock(build())]);

    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Download link copied'));
    expect(writeText).toHaveBeenCalledWith(build().apk_url);
  });

  it('explains how to copy by hand when the clipboard refuses', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    renderWithApollo(<DownloadAppPage />, [mock(build())]);

    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(expect.stringContaining('could not be copied')));
  });

  it('shows the error with a retry that asks again', async () => {
    renderWithApollo(<DownloadAppPage />, [{ request: { query: CRM_APP_DOWNLOAD }, error: new Error('down') }, mock(build())]);

    expect(await screen.findByText('The app download could not be loaded.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('region', { name: 'Latest app' })).toBeInTheDocument();
  });

  it('always lists the install steps and that the app is Android only', async () => {
    renderWithApollo(<DownloadAppPage />, [mock(build())]);
    const steps = await screen.findByRole('region', { name: 'Install on Android' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(within(steps).getByText(/Android only/)).toBeInTheDocument();
  });
});
