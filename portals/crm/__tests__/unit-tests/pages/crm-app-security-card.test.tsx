import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ConfirmProvider } from '@duncit/dialogs';
import { CrmAppSecurityCard } from '@/pages/download-app/CrmAppSecurityCard';
import { CRM_APP_SETTINGS, UPDATE_CRM_APP_SETTINGS } from '@/api/appDownload.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
  notifyError,
}));

const LABEL = 'Ask for Security Verification on the Duncit CRM app';

const settingsMock = (security_verification: boolean): MockedResponse => ({
  request: { query: CRM_APP_SETTINGS },
  result: { data: { crmAppSettings: { __typename: 'CrmAppSettings', security_verification } } },
});

/** The save, with a spy that says whether it was ever sent. */
const saveMock = (security_verification: boolean, outcome: 'ok' | Error = 'ok') => {
  const sent = vi.fn(() => ({
    data: { updateCrmAppSettings: { __typename: 'CrmAppSettings', security_verification } },
  }));
  const mock: MockedResponse = {
    request: { query: UPDATE_CRM_APP_SETTINGS, variables: { input: { security_verification } } },
    ...(outcome === 'ok' ? { result: sent } : { error: outcome }),
  };
  return { mock, sent };
};

const renderCard = (mocks: MockedResponse[]) =>
  renderWithApollo(
    <ConfirmProvider>
      <CrmAppSecurityCard />
    </ConfirmProvider>,
    mocks,
  );

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('CrmAppSecurityCard', () => {
  it('shows the switch on while the app asks, with what it does', async () => {
    renderCard([settingsMock(true)]);

    const toggle = await screen.findByRole('switch', { name: LABEL });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/the CRM web portal always asks/);
  });

  it('asks before turning it off, and changes nothing when the person cancels', async () => {
    const save = saveMock(false);
    renderCard([settingsMock(true), save.mock]);

    fireEvent.click(await screen.findByRole('switch', { name: LABEL }));
    const dialog = await screen.findByRole('dialog', { name: 'Stop asking for Security Verification on the app?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('switch', { name: LABEL })).toBeChecked();
    expect(save.sent).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('turns it off once confirmed, and says so', async () => {
    const save = saveMock(false);
    renderCard([settingsMock(true), save.mock]);

    fireEvent.click(await screen.findByRole('switch', { name: LABEL }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Turn off' }));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('The Duncit CRM app will no longer ask for Security Verification at sign-in.'),
    );
    expect(save.sent).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('switch', { name: LABEL })).not.toBeChecked();
  });

  it('turns it back on without asking', async () => {
    const save = saveMock(true);
    renderCard([settingsMock(false), save.mock]);

    const toggle = await screen.findByRole('switch', { name: LABEL });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('The Duncit CRM app will ask for Security Verification at sign-in.'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('switch', { name: LABEL })).toBeChecked();
  });

  it('reports a refused save and keeps showing what is stored', async () => {
    const save = saveMock(false, new Error('Access Denied'));
    renderCard([settingsMock(true), save.mock]);

    fireEvent.click(await screen.findByRole('switch', { name: LABEL }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Access Denied'));
    expect(notifySuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('switch', { name: LABEL })).toBeChecked();
  });

  it('says when the setting could not be loaded, with a retry, and no switch', async () => {
    renderCard([{ request: { query: CRM_APP_SETTINGS }, error: new Error('down') }]);

    expect(await screen.findByText('The sign-in security setting could not be loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
