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

const APK_URL = 'https://server.duncit.com/app-builds/duncit-crm-android-v1.0.4.apk';
const AAB_URL = 'https://server.duncit.com/app-builds/duncit-crm-android-v1.0.4.aab';
const IPA_URL = 'https://server.duncit.com/app-builds/duncit-crm-ios-v1.0.4.ipa';

const file = (kind: 'APK' | 'AAB' | 'IPA', url: string, size_mb: number | null) => ({
  __typename: 'AppBuildArtifact' as const,
  kind,
  url,
  size_mb,
});

const android = (over: Partial<CrmAppBuild> = {}): CrmAppBuild => ({
  build_no: 'DUN-BLD-000120',
  version: '1.0.4',
  build_number: '42',
  platform: 'ANDROID',
  app_env: 'PRODUCTION',
  created_at: '2026-11-24T08:30:00.000Z',
  artifacts: [file('APK', APK_URL, 48.25), file('AAB', AAB_URL, 31.2)],
  ...over,
});

const ios = (over: Partial<CrmAppBuild> = {}): CrmAppBuild =>
  android({ build_no: 'DUN-BLD-000121', platform: 'IOS', artifacts: [file('IPA', IPA_URL, 22.4)], ...over });

const typed = (build: CrmAppBuild | null) => build && { __typename: 'CrmAppDownloadBuild', ...build };

const mock = (
  builds: Partial<Record<'production' | 'staging' | 'ios_production' | 'ios_staging', CrmAppBuild | null>> = {}
) => ({
  request: { query: CRM_APP_DOWNLOAD },
  result: {
    data: {
      crmAppDownload: {
        __typename: 'CrmAppDownload',
        production: typed(builds.production ?? null),
        staging: typed(builds.staging ?? null),
        ios_production: typed(builds.ios_production ?? null),
        ios_staging: typed(builds.ios_staging ?? null),
      },
    },
  },
});

const section = (name: 'Android' | 'iPhone') => screen.findByRole('region', { name });

afterEach(() => vi.clearAllMocks());

describe('DownloadAppPage', () => {
  it('offers the latest Android APK and AAB, with the APK’s version, build and size', async () => {
    renderWithApollo(<DownloadAppPage />, [mock({ production: android() })]);

    const card = within(await section('Android')).getByRole('region', { name: 'Latest app' });
    expect(within(card).getByText(/Version 1\.0\.4 · Build 42 · 48\.3 MB/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Download APK' })).toHaveAttribute('href', APK_URL);
    expect(within(card).getByRole('link', { name: 'Download AAB' })).toHaveAttribute('href', AAB_URL);
    expect(within(card).getByText(/AAB is for publishing on Google Play/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Staging app' })).toBeNull();
  });

  it('offers the latest iPhone IPA in its own section, and says it installs through TestFlight', async () => {
    renderWithApollo(<DownloadAppPage />, [mock({ production: android(), ios_production: ios({ build_number: '700' }) })]);

    const iphone = await section('iPhone');
    const card = within(iphone).getByRole('region', { name: 'Latest app' });
    expect(within(card).getByText(/Version 1\.0\.4 · Build 700 · 22\.4 MB/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Download IPA' })).toHaveAttribute('href', IPA_URL);
    expect(within(card).queryByRole('link', { name: 'Download APK' })).toBeNull();
    expect(within(card).getByText(/installs the app through TestFlight/)).toBeInTheDocument();
  });

  it('adds each platform’s staging build beside it, labelled for testing', async () => {
    renderWithApollo(<DownloadAppPage />, [
      mock({
        production: android(),
        staging: android({ version: '1.0.5', app_env: 'STAGING', build_number: null, artifacts: [file('APK', APK_URL, null)] }),
        ios_staging: ios({ version: '1.0.6', app_env: 'STAGING', build_number: null }),
      }),
    ]);

    const androidStaging = within(await section('Android')).getByRole('region', { name: 'Staging app' });
    expect(within(androidStaging).getByText('Testing only')).toBeInTheDocument();
    expect(within(androidStaging).getByText('Version 1.0.5')).toBeInTheDocument();
    expect(within(androidStaging).queryByRole('link', { name: 'Download AAB' })).toBeNull();
    const iosStaging = within(await section('iPhone')).getByRole('region', { name: 'Staging app' });
    expect(within(iosStaging).getByText(/Version 1\.0\.6/)).toBeInTheDocument();
  });

  it('says so for each platform when nothing has been built yet', async () => {
    renderWithApollo(<DownloadAppPage />, [mock()]);
    expect(await screen.findAllByText('No Duncit CRM app has been built for this environment yet.')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Download/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });

  it('copies the APK link, never the AAB’s, and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWithApollo(<DownloadAppPage />, [mock({ production: android() })]);

    fireEvent.click(within(await section('Android')).getByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Download link copied'));
    expect(writeText).toHaveBeenCalledWith(APK_URL);
  });

  it('explains how to copy by hand when the clipboard refuses', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    renderWithApollo(<DownloadAppPage />, [mock({ ios_production: ios() })]);

    fireEvent.click(within(await section('iPhone')).getByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(expect.stringContaining('could not be copied')));
  });

  it('shows the error with a retry that asks again', async () => {
    renderWithApollo(<DownloadAppPage />, [
      { request: { query: CRM_APP_DOWNLOAD }, error: new Error('down') },
      mock({ production: android() }),
    ]);

    expect(await screen.findByText('The app download could not be loaded.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await section('Android')).toBeInTheDocument();
  });

  it('lists each platform’s install steps, and what an iPhone cannot do', async () => {
    renderWithApollo(<DownloadAppPage />, [mock({ production: android() })]);

    const androidSection = await section('Android');
    expect(within(androidSection).getByRole('heading', { name: 'Install on Android' })).toBeInTheDocument();
    expect(within(androidSection).getAllByRole('listitem')).toHaveLength(4);

    const iphone = await section('iPhone');
    expect(within(iphone).getByRole('heading', { name: 'Install on iPhone' })).toBeInTheDocument();
    const steps = within(iphone).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('TestFlight');
    expect(within(iphone).getByText(/caller ID and call logging are not available/)).toBeInTheDocument();
  });
});
