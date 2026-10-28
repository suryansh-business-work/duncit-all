import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_ADMIN_SETTINGS, LITE_ADMIN_UPDATE_SETTINGS } from '../../../graphql/admin';
import { SettingsPage } from '../../../pages/settings';
import { makeSettings } from '../../fixtures';
import { gqlSettings } from '../../gql-results';
import { findToast, renderWithProviders, type GqlMock } from '../../test-utils';

const stored = makeSettings();

const settingsQuery = (settings = stored, maxUsageCount = 2): GqlMock => ({
  request: { query: LITE_ADMIN_SETTINGS },
  result: { data: { liteAdminSettings: gqlSettings(settings) } },
  maxUsageCount,
});

describe('SettingsPage', () => {
  it('loads the stored settings into the form under the page header', async () => {
    renderWithProviders(<SettingsPage />, { mocks: [settingsQuery()] });
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('How Lite presents itself and what it allows.')).toBeInTheDocument();
    expect(await screen.findByTestId('settings-site-name')).toHaveValue('Duncit Lite');
    expect(screen.getByTestId('settings-max-event-capacity')).toHaveValue('5000');
  });

  it('shows a loader while the settings are on their way', () => {
    renderWithProviders(<SettingsPage />, { mocks: [settingsQuery()] });
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('saves the whole settings input and confirms it', async () => {
    const user = userEvent.setup();
    const saved = makeSettings({ max_seats_per_registration: 20, sign_in_with_phone: true });
    const update: GqlMock = {
      request: { query: LITE_ADMIN_UPDATE_SETTINGS, variables: { input: saved } },
      result: { data: { liteAdminUpdateSettings: gqlSettings(saved) } },
    };
    renderWithProviders(<SettingsPage />, { mocks: [settingsQuery(), update] });

    const seats = await screen.findByTestId('settings-max-seats');
    await user.clear(seats);
    await user.type(seats, '20');
    await user.click(screen.getByLabelText('Sign in with phone number'));
    await user.click(screen.getByTestId('settings-save'));

    expect(await findToast('success')).toHaveTextContent('Settings saved');
    await waitFor(() => expect(screen.getByTestId('settings-save')).toBeDisabled());
  });

  it("keeps the edit and shows the API's message when the save is refused", async () => {
    const user = userEvent.setup();
    const update: GqlMock = {
      request: { query: LITE_ADMIN_UPDATE_SETTINGS, variables: { input: makeSettings({ site_name: 'Lite Events' }) } },
      result: { errors: [new GraphQLError('Only admins can change settings')] },
    };
    renderWithProviders(<SettingsPage />, { mocks: [settingsQuery(), update] });

    const name = await screen.findByTestId('settings-site-name');
    await user.clear(name);
    await user.type(name, 'Lite Events');
    await user.click(screen.getByTestId('settings-save'));

    expect(await findToast('error')).toHaveTextContent('Only admins can change settings');
    expect(screen.getByTestId('settings-save')).toBeEnabled();
  });

  it('shows the load error instead of the form', async () => {
    renderWithProviders(<SettingsPage />, { mocks: [{ request: { query: LITE_ADMIN_SETTINGS }, error: new Error('Settings store unavailable') }] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Settings store unavailable');
    expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument();
  });
});
