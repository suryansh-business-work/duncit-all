import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../testkit';
import { makeSocialAccount, makeSocialSettings, socialSettingsErrorMock, socialSettingsMock, updateSocialSettingsErrorMock, updateSocialSettingsMock } from '../mocks';
import { SOCIAL_WEBHOOK_URL } from '../../src/pages/settings-page/queries';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
const userCtx = vi.hoisted(() => ({ value: null as { user: { user_id: string; roles: string[] } | null } | null }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import SocialSettingsTab from '../../src/pages/social-accounts-page/settings/SocialSettingsTab';
import { MessagingLine } from '../../src/pages/social-accounts-page/accounts/AccountHealth';
import { settingsInput, settingsFormValues } from '../../src/pages/social-accounts-page/social-settings-form';

const webhookMock: MockedResponse = { request: { query: SOCIAL_WEBHOOK_URL }, result: { data: { socialWebhookUrl: 'https://api/social/webhooks/meta' } } };
const renderTab = (mocks: MockedResponse[]) => renderWithProviders(<SocialSettingsTab />, { mocks: [...mocks, webhookMock] });

/** Change one number once the form has settled, and press Save once it is enabled. */
async function changeAndSave(label: RegExp, value: string) {
  await screen.findByRole('spinbutton', { name: label });
  await act(flush);
  fireEvent.change(screen.getByRole('spinbutton', { name: label }), { target: { value } });
  await waitFor(() => expect(screen.getByTestId('social-settings-save')).toBeEnabled());
  fireEvent.click(screen.getByTestId('social-settings-save'));
}

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SocialSettingsTab', () => {
  it('lets a manager change a setting and save it, then reads it back', async () => {
    const settings = makeSocialSettings();
    const changed = settingsInput({ ...settingsFormValues(settings), backfill_days: 14 });
    const saved = makeSocialSettings({ backfill_days: 14 });
    renderTab([socialSettingsMock(settings), updateSocialSettingsMock(changed, saved), socialSettingsMock(saved)]);
    await changeAndSave(/DM history on connect/, '14');
    expect(screen.getByTestId('webhook-url-field')).toBeInTheDocument();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Settings saved.', 'success'), { timeout: 4000 });
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: /DM history on connect/ })).toHaveValue(14));
  });

  it('shows the server’s refusal when a save fails', async () => {
    const settings = makeSocialSettings();
    const changed = settingsInput({ ...settingsFormValues(settings), expiry_alert_days: 10 });
    renderTab([socialSettingsMock(settings), updateSocialSettingsErrorMock(changed, 'Access denied')]);
    await changeAndSave(/Token reminder/, '10');
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Access denied', 'error'), { timeout: 4000 });
  });

  it('is read-only for an editor, and for nobody signed in', async () => {
    userCtx.value = { user: { user_id: 'u2', roles: ['MARKETING_EDITOR'] } };
    renderTab([socialSettingsMock()]);
    expect(await screen.findByTestId('social-settings-read-only')).toBeInTheDocument();
  });

  it('treats a missing user as someone who may only read', async () => {
    userCtx.value = { user: null };
    renderTab([socialSettingsMock()]);
    expect(await screen.findByTestId('social-settings-read-only')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-assignee-change')).not.toBeInTheDocument();
  });

  it('says when the settings cannot be read', async () => {
    renderTab([socialSettingsErrorMock('Settings down')]);
    expect(await screen.findByText('Settings down')).toBeInTheDocument();
    expect(screen.queryByTestId('social-settings-form')).not.toBeInTheDocument();
  });
});

describe('MessagingLine', () => {
  it('blocks with a warning and a working Reconnect when the messaging permission is missing, naming failed reads and webhooks', () => {
    const onReconnect = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <MessagingLine
        account={makeSocialAccount({ messaging_missing_permission: 'instagram_manage_messages', webhook_error: 'needs pages_manage_metadata', dm_error: 'boom' })}
        onReconnect={onReconnect}
      />
    );
    const line = screen.getByTestId('social-messaging-line');
    expect(line).toHaveTextContent(
      'Reconnect to enable messaging (needs instagram_manage_messages). · Webhooks are not set up for this Page: needs pages_manage_metadata · Direct messages could not be read: boom'
    );
    expect(line).toHaveClass('MuiAlert-root');
    fireEvent.click(screen.getByTestId('social-messaging-reconnect-sa1'));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('only notes a failed DM read, with no Reconnect, when nothing blocks messaging', () => {
    renderWithProviders(<MessagingLine account={makeSocialAccount({ dm_error: 'timed out' })} onReconnect={vi.fn()} />);
    expect(screen.getByTestId('social-messaging-line')).toHaveTextContent('Direct messages could not be read: timed out');
    expect(screen.queryByTestId('social-messaging-reconnect-sa1')).not.toBeInTheDocument();
  });

  it('says nothing for an account that is ready', () => {
    renderWithProviders(<MessagingLine account={makeSocialAccount()} onReconnect={vi.fn()} />);
    expect(screen.queryByTestId('social-messaging-line')).not.toBeInTheDocument();
  });
});
