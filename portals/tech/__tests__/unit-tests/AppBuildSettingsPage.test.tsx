import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

const copy = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/utils', async (io) => ({
  ...(await io<typeof import('@duncit/utils')>()),
  copyToClipboard: copy,
}));

import AppBuildSettingsPage from '../../src/pages/app-builds/AppBuildSettingsPage';
import { toAppBuildSettingsForm, appBuildSettingsSchema } from '../../src/pages/app-builds/settings/app-build-settings.types';
import {
  MAX_REMINDER_HOURS,
  MIN_REMINDER_HOURS,
  releaseNoticesSchema,
  splitMailTo,
  toFormValues,
  toSettingsInput,
} from '../../src/pages/app-builds/settings/release-notices/release-notices.types';

const signing = {
  __typename: 'IosSigning',
  id: 'sign1',
  bundle_id: 'test.example.app',
  team_id: 'TEAM123',
  certificate_serial: 'ABC123',
  profile_name: 'Duncit AppStore',
  expires_at: '2027-01-01T00:00:00.000Z',
  created_by: 'ops',
  created_at: '2026-01-01T00:00:00.000Z',
};

const appSettings = (over: Record<string, unknown> = {}) => ({
  __typename: 'AppBuildSettings',
  android_channel: 'C0ANDROID',
  ios_channel: null,
  android_staging_channel: null,
  ios_staging_channel: null,
  last_reported_at: '2026-01-02T10:00:00.000Z',
  last_reported_by: 'ci@example.test',
  play_store_configured: true,
  play_package_name: 'test.example.app',
  app_store_configured: true,
  app_store_bundle_id: 'test.example.app',
  ios_signing: signing,
  ...over,
});

const noticeSettings = (over: Record<string, unknown> = {}) => ({
  __typename: 'StoreReleaseSettings',
  notify_enabled: true,
  slack_channel: 'C0NOTICES',
  mail_to: ['ops@example.test'],
  reminders_enabled: true,
  reminder_hours: 24,
  updated_at: '2026-01-03T10:00:00.000Z',
  updated_by: 'ops@example.test',
  ...over,
});

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

const mount = () =>
  renderWithProviders(<></>, {
    routes: (
      <>
        <Route
          path="/"
          element={
            <>
              <AppBuildSettingsPage />
              <Where />
            </>
          }
        />
      </>
    ),
  });

const seed = (settings: Record<string, unknown> | null = appSettings(), slack = true) => {
  ops.q = {
    SlackConfigured: { data: { slackConfigured: slack } },
    SlackChannels: { data: { slackChannels: [{ __typename: 'SlackChannel', id: 'C0ANDROID', name: 'android-builds', is_private: false }] } },
    AppBuildSettings: settings ? { data: { appBuildSettings: settings } } : {},
    StoreReleaseSettings: { data: { storeReleaseSettings: noticeSettings() } },
  };
};

beforeEach(() => {
  resetOps();
  copy.mockReset();
  seed();
});

describe('App build settings page / channels', () => {
  it('shows the stored channels and saves what is typed', async () => {
    ops.mut.UpdateAppBuildSettings = vi.fn().mockResolvedValue({ data: {} });
    mount();

    expect(screen.getByRole('combobox', { name: 'Android builds channel' })).toHaveValue('#android-builds (C0ANDROID)');
    fireEvent.change(screen.getByRole('combobox', { name: 'iOS builds channel' }), { target: { value: 'C0IOS12345' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    await waitFor(() =>
      expect(mutation('UpdateAppBuildSettings')).toHaveBeenCalledWith({
        variables: {
          input: {
            android_channel: 'C0ANDROID',
            ios_channel: 'C0IOS12345',
            android_staging_channel: '',
            ios_staging_channel: '',
          },
        },
      }),
    );
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith('Build channels saved.', 'success'));
  });

  it('refuses a malformed channel id and sends nothing', async () => {
    mount();
    fireEvent.change(screen.getByRole('combobox', { name: 'iOS builds channel' }), { target: { value: 'not-an-id' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect(await screen.findByText('A Slack channel ID looks like C0123ABCD.')).toBeInTheDocument();
    expect(mutation('UpdateAppBuildSettings')).not.toHaveBeenCalled();
  });

  it('reports a failed save, whether it throws an Error or text', async () => {
    ops.mut.UpdateAppBuildSettings = vi.fn().mockRejectedValueOnce(new Error('forbidden')).mockRejectedValueOnce('boom');
    mount();

    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('forbidden'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('boom'));
  });

  it('warns that Slack is not connected and offers no form, but still shows the credential cards', () => {
    seed(appSettings(), false);
    mount();

    expect(screen.getAllByText(/Slack is not connected/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('combobox', { name: 'Android builds channel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate CI token' })).toBeInTheDocument();
  });

  it('waits for the settings while Slack is connected', () => {
    seed(null);
    mount();
    expect(screen.queryByRole('combobox', { name: 'Android builds channel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate CI token' })).not.toBeInTheDocument();
  });

  it('shows the form with no channel list while the channels have not loaded, and a busy save button', () => {
    ops.q.SlackChannels = { loading: true };
    ops.mutLoading.UpdateAppBuildSettings = true;
    ops.mutLoading.UpdateStoreReleaseSettings = true;
    mount();

    expect(screen.getByRole('combobox', { name: 'Android builds channel' })).toHaveValue('C0ANDROID');
    expect(screen.getAllByRole('button', { name: 'Saving…' })).toHaveLength(2);
  });

  it('shows no warning while Slack is still being checked', () => {
    ops.q.SlackConfigured = { loading: true };
    mount();
    expect(screen.queryByText(/Slack is not connected/i)).not.toBeInTheDocument();
  });
});

describe('App build settings page / CI credential', () => {
  it('says CI has never reported, and names the account of a report with none', () => {
    seed(appSettings({ last_reported_at: null }));
    const { unmount } = mount();
    expect(screen.getByText(/No build has ever been reported/)).toBeInTheDocument();
    unmount();

    seed(appSettings({ last_reported_by: null }));
    mount();
    expect(screen.getByText(/CI last reported on .+, as —\./)).toBeInTheDocument();
  });

  it('mints a token, shows it once with copy buttons, and reports what the clipboard did', async () => {
    ops.mut.IssueAppBuildCiToken = vi.fn().mockResolvedValue({
      data: { issueAppBuildCiToken: { token: 'jwt.value.here', secret_name: 'DUNCIT_CI_TOKEN', issued_for: 'ops@example.test' } },
    });
    copy.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('denied'));
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Generate CI token' }));

    expect(await screen.findByDisplayValue('DUNCIT_CI_TOKEN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jwt.value.here')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate CI token' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy the secret name' }));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith('Copied.', 'success'));
    expect(copy).toHaveBeenLastCalledWith('DUNCIT_CI_TOKEN');

    fireEvent.click(screen.getByRole('button', { name: 'Copy the token' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    expect(copy).toHaveBeenLastCalledWith('jwt.value.here');

    fireEvent.click(screen.getByRole('button', { name: 'Copy the token' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));
    expect(ops.notifyError).toHaveBeenLastCalledWith(expect.stringContaining('clipboard'));
  });

  it('keeps the button when the server returns no token, and reports a refused mint', async () => {
    ops.mut.IssueAppBuildCiToken = vi
      .fn()
      .mockResolvedValueOnce({ data: undefined })
      .mockRejectedValueOnce(new Error('not an admin'))
      .mockRejectedValueOnce('text failure');
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Generate CI token' }));
    await waitFor(() => expect(ops.mut.IssueAppBuildCiToken).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Generate CI token' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate CI token' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('not an admin'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate CI token' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('text failure'));
  });

  it('disables the button while a token is being made', () => {
    ops.mutLoading.IssueAppBuildCiToken = true;
    mount();
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
  });
});

describe('App build settings page / stores', () => {
  it('says Google Play is connected or not, and opens Environment Variables', () => {
    const { unmount } = mount();
    expect(screen.getByText(/Connected\. A push from the Android table releases to test\.example\.app/)).toBeInTheDocument();
    unmount();

    seed(appSettings({ play_store_configured: false }));
    mount();
    expect(screen.getAllByText(/Google Play is not connected/).length).toBeGreaterThan(0);
    for (const button of screen.getAllByRole('button', { name: 'Open Environment Variables' })) fireEvent.click(button);
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });

  it('says App Store Connect is not connected and disables generating', () => {
    seed(appSettings({ app_store_configured: false }));
    mount();
    expect(screen.getByText(/App Store Connect is not connected/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate new signing files' })).toBeDisabled();
  });

  it('says there are no signing files yet, and offers to generate the first set', () => {
    seed(appSettings({ ios_signing: null }));
    mount();
    expect(screen.getByText(/No signing files yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate signing files' })).toBeEnabled();
  });

  it('shows the current signing identity, with a dash for one that has no expiry date', () => {
    seed(appSettings({ ios_signing: { ...signing, expires_at: null } }));
    mount();
    expect(screen.getByText(/ABC123/)).toHaveTextContent('—');
    expect(screen.getByText(/TEAM123/)).toBeInTheDocument();
  });

  it('generates new signing files only after confirmation, and re-reads the settings', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.AppBuildSettings = { data: { appBuildSettings: appSettings() }, refetch };
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.GenerateIosSigning = vi.fn().mockResolvedValue({ data: {} });
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Generate new signing files' }));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.mut.GenerateIosSigning).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Generate new signing files' }));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('Signing files generated')));
    expect(refetch).toHaveBeenCalled();
  });

  it('reports a failed generation', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.GenerateIosSigning = vi.fn().mockRejectedValue(new Error('Apple said no'));
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Generate new signing files' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('Apple said no'));
  });
});

describe('App build settings page / release notices', () => {
  const card = () => within(screen.getByTestId('release-notices-card'));

  it('shows the stored notice settings and when they were saved', () => {
    mount();
    expect(card().getByRole('textbox', { name: /Mail to/ })).toHaveValue('ops@example.test');
    expect(card().getByText(/ops@example\.test/, { selector: 'span.MuiTypography-caption' })).toBeInTheDocument();
  });

  it('says Slack is not connected, so only mail goes out', () => {
    seed(appSettings(), false);
    mount();
    expect(card().getByText(/only the mail goes out/)).toBeInTheDocument();
  });

  it('waits for the settings, and shows a failed read', () => {
    ops.q.StoreReleaseSettings = { loading: true };
    const { unmount } = mount();
    expect(screen.queryByTestId('release-notices-form')).not.toBeInTheDocument();
    unmount();

    ops.q.StoreReleaseSettings = { error: new Error('notices unavailable') };
    mount();
    expect(card().getByText('notices unavailable')).toBeInTheDocument();
  });

  it('saves the changed settings with the addresses split into a clean list', async () => {
    ops.mut.UpdateStoreReleaseSettings = vi.fn().mockResolvedValue({ data: {} });
    mount();

    fireEvent.change(card().getByRole('textbox', { name: /Mail to/ }), {
      target: { value: 'Ops@Example.test, qa@example.test\nops@example.test' },
    });
    fireEvent.change(card().getByRole('spinbutton', { name: 'Reminder window (hours)' }), { target: { value: '48' } });
    fireEvent.click(card().getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mutation('UpdateStoreReleaseSettings')).toHaveBeenCalledWith({
        variables: {
          input: {
            notify_enabled: true,
            slack_channel: 'C0NOTICES',
            mail_to: ['ops@example.test', 'qa@example.test'],
            reminders_enabled: true,
            reminder_hours: 48,
          },
        },
      }),
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Build channels saved.'));
  });

  it('refuses no address, a bad address and a window outside the range', async () => {
    mount();

    fireEvent.change(card().getByRole('textbox', { name: /Mail to/ }), { target: { value: '' } });
    fireEvent.click(card().getByRole('button', { name: 'Save' }));
    expect(await card().findByText('Add at least one address.')).toBeInTheDocument();

    fireEvent.change(card().getByRole('textbox', { name: /Mail to/ }), { target: { value: 'not-an-address' } });
    expect(await card().findByText('One of the addresses is not a valid email address.')).toBeInTheDocument();

    fireEvent.change(card().getByRole('textbox', { name: /Mail to/ }), { target: { value: 'ops@example.test' } });
    fireEvent.change(card().getByRole('spinbutton', { name: 'Reminder window (hours)' }), { target: { value: '999' } });
    expect(await card().findByText('A whole number from 1 to 168 hours.', { selector: 'p.Mui-error' })).toBeInTheDocument();
    expect(mutation('UpdateStoreReleaseSettings')).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    ops.mut.UpdateStoreReleaseSettings = vi.fn().mockRejectedValue(new Error('mail refused'));
    mount();

    fireEvent.click(card().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('mail refused'));
  });

  it('omits the saved-by line for settings that were never saved', () => {
    ops.q.StoreReleaseSettings = { data: { storeReleaseSettings: noticeSettings({ updated_at: null }) } };
    mount();
    expect(card().queryByText(/ops@example\.test/, { selector: 'span.MuiTypography-caption' })).not.toBeInTheDocument();
  });
});

describe('settings schemas and mappers', () => {
  it('opens the channel form with empty text for a channel that was never set', () => {
    expect(
      toAppBuildSettingsForm({ android_channel: 'C0A', ios_channel: null, android_staging_channel: null, ios_staging_channel: 'C0B' }),
    ).toEqual({ android_channel: 'C0A', ios_channel: '', android_staging_channel: '', ios_staging_channel: 'C0B' });
    expect(
      toAppBuildSettingsForm({ android_channel: null, ios_channel: 'C0I', android_staging_channel: 'C0S', ios_staging_channel: null }),
    ).toEqual({ android_channel: '', ios_channel: 'C0I', android_staging_channel: 'C0S', ios_staging_channel: '' });
  });

  it('accepts an empty channel and a channel id, and refuses anything else', () => {
    const schema = appBuildSettingsSchema({ channelFormat: 'bad' });
    const base = { android_channel: '', ios_channel: 'C0123ABCD', android_staging_channel: ' G0123ABCD ', ios_staging_channel: '' };

    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, ios_channel: 'c0123abcd' }).success).toBe(false);
    expect(schema.safeParse({ ...base, ios_channel: 'C01' }).success).toBe(false);
  });

  it('splits addresses on newlines, commas and semicolons, lower-cased and de-duplicated', () => {
    expect(splitMailTo('A@x.test; b@x.test,\n a@x.test ,, ')).toEqual(['a@x.test', 'b@x.test']);
    expect(splitMailTo('  ')).toEqual([]);
  });

  it('bounds the reminder window at one hour to one week', () => {
    const schema = releaseNoticesSchema({ channelFormat: 'c', mailInvalid: 'm', mailRequired: 'r', hoursRange: 'h' });
    const ok = (reminder_hours: number) =>
      schema.safeParse({
        notify_enabled: true,
        slack_channel: '',
        mail_to_text: 'a@x.test',
        reminders_enabled: true,
        reminder_hours,
      }).success;

    expect(ok(MIN_REMINDER_HOURS)).toBe(true);
    expect(ok(MAX_REMINDER_HOURS)).toBe(true);
    expect(ok(MIN_REMINDER_HOURS - 1)).toBe(false);
    expect(ok(MAX_REMINDER_HOURS + 1)).toBe(false);
    expect(ok(1.5)).toBe(false);
  });

  it('turns stored settings into form text and back into the mutation input', () => {
    const stored = noticeSettings({ mail_to: ['a@x.test', 'b@x.test'] }) as unknown as Parameters<typeof toFormValues>[0];
    const form = toFormValues(stored);

    expect(form.mail_to_text).toBe('a@x.test\nb@x.test');
    expect(toSettingsInput(form)).toEqual({
      notify_enabled: true,
      slack_channel: 'C0NOTICES',
      mail_to: ['a@x.test', 'b@x.test'],
      reminders_enabled: true,
      reminder_hours: 24,
    });
  });
});
