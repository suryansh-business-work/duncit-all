import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ConfirmProvider } from '@duncit/dialogs';
import CrmAppSettingsPage from '@/pages/download-app/settings';
import { CRM_APP_BUILD_SETTINGS, CRM_APP_SETTINGS, type CrmAppBuildSettings } from '@/api/appDownload.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const settings = (over: Partial<CrmAppBuildSettings> = {}): CrmAppBuildSettings => ({
  slack_configured: true,
  production_channel: 'C-CRM',
  staging_channel: null,
  channels: [{ id: 'C-CRM', name: 'crm-app', is_private: false, is_member: true }],
  channels_error: null,
  ...over,
});

const mock = (value: CrmAppBuildSettings) => ({
  request: { query: CRM_APP_BUILD_SETTINGS },
  result: {
    data: {
      crmAppBuildSettings: {
        __typename: 'CrmAppBuildSettings',
        ...value,
        channels: value.channels.map((c) => ({ __typename: 'CrmSlackChannel', ...c })),
      },
    },
  },
});

const appSettings: MockedResponse = {
  request: { query: CRM_APP_SETTINGS },
  result: { data: { crmAppSettings: { __typename: 'CrmAppSettings', security_verification: true } } },
};

/** The page as the shell mounts it: the confirm dialog host around it, the app settings answered. */
const renderPage = (mocks: MockedResponse[]) =>
  renderWithApollo(
    <ConfirmProvider>
      <CrmAppSettingsPage />
    </ConfirmProvider>,
    [appSettings, ...mocks],
  );

afterEach(() => vi.clearAllMocks());

describe('CrmAppSettingsPage', () => {
  it('shows the app sign-in security switch above the build channels', async () => {
    renderPage([mock(settings())]);
    expect(await screen.findByRole('switch', { name: 'Ask for Security Verification on the Duncit CRM app' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Build announcements on Slack' })).toBeInTheDocument();
  });

  it('shows the production and staging pickers with the stored channel', async () => {
    renderPage([mock(settings())]);
    expect(await screen.findByTestId('crm-app-channels-form')).toBeInTheDocument();
    expect(screen.getByTestId('crm-channel-production_channel')).toHaveValue('C-CRM');
    expect(screen.getByTestId('crm-channel-staging_channel')).toHaveValue('');
  });

  it('explains that Slack must be connected first, without a form', async () => {
    renderPage([mock(settings({ slack_configured: false, channels: [] }))]);
    expect(await screen.findByText(/Slack is not connected yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('crm-app-channels-form')).toBeNull();
  });

  it('says why the channel list is missing', async () => {
    renderPage([mock(settings({ channels: [], channels_error: 'missing_scope' }))]);
    expect(await screen.findByText('Slack channels could not be read: missing_scope')).toBeInTheDocument();
  });

  it('shows the load error with a retry', async () => {
    renderPage([{ request: { query: CRM_APP_BUILD_SETTINGS }, error: new Error('down') }]);
    expect(await screen.findByText('The settings could not be loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
