import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ConnectedAccountsSection from '../ConnectedAccountsSection';
import {
  CONNECT_GOOGLE_ACCOUNT,
  DISCONNECT_GOOGLE_ACCOUNT,
  MY_CONNECTED_ACCOUNTS,
  type ConnectedAccounts,
} from '../connected-queries';

// The real button loads Google's SDK; what this section owns is what it does
// with the credential the button hands back.
vi.mock('../../../components/GoogleSignInButton', () => ({
  default: ({ onCredential, loading }: any) => (
    <button type="button" disabled={loading} onClick={() => onCredential('google-id-token')}>
      google-sign-in
    </button>
  ),
}));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => `day:${d}` }),
}));

const GOOGLE = { google_email: 'meera@gmail.com', linked_at: '2026-05-04T10:00:00.000Z' };

const accounts = (over: Partial<ConnectedAccounts> = {}): ConnectedAccounts => ({
  email: 'meera@example.com',
  has_password: true,
  google: null,
  ...over,
});

const accountsMock = (value: ConnectedAccounts): MockedResponse => ({
  request: { query: MY_CONNECTED_ACCOUNTS },
  result: { data: { myConnectedAccounts: value } },
});

function renderSection(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ConnectedAccountsSection />
    </MockedProvider>,
  );
}

describe('ConnectedAccountsSection', () => {
  it('lists email/password as active and Google as connectable', async () => {
    renderSection([accountsMock(accounts())]);

    expect(screen.getByTestId('connected-accounts-title')).toHaveTextContent('Connected accounts');
    await waitFor(() => expect(screen.getByTestId('connected-email-value')).toHaveTextContent('meera@example.com'));
    expect(screen.getByTestId('connected-email')).toHaveTextContent('Active');
    expect(screen.getByTestId('connected-google-value')).toHaveTextContent('Not connected');
    expect(screen.getByRole('button', { name: 'google-sign-in' })).toBeInTheDocument();
    expect(screen.queryByTestId('connected-google-action')).not.toBeInTheDocument();
  });

  it('marks email sign-in as not set when the account has no password', async () => {
    renderSection([accountsMock(accounts({ has_password: false }))]);
    await waitFor(() => expect(screen.getByTestId('connected-email')).toHaveTextContent('Not set'));
  });

  it('shows the linked Google account with its date and a disconnect action', async () => {
    renderSection([accountsMock(accounts({ google: GOOGLE }))]);

    await waitFor(() => expect(screen.getByTestId('connected-google-value')).toHaveTextContent('meera@gmail.com'));
    expect(screen.getByTestId('connected-google')).toHaveTextContent('Connected on day:2026-05-04T10:00:00.000Z');
    expect(screen.getByTestId('connected-google-action')).toHaveTextContent('Disconnect');
    expect(screen.queryByRole('button', { name: 'google-sign-in' })).not.toBeInTheDocument();
  });

  it('omits the linked date when the server has none', async () => {
    renderSection([accountsMock(accounts({ google: { ...GOOGLE, linked_at: null } }))]);
    await waitFor(() => expect(screen.getByTestId('connected-google-value')).toHaveTextContent('meera@gmail.com'));
    expect(screen.getByTestId('connected-google')).not.toHaveTextContent('Connected on');
  });

  it('withholds disconnect, with the reason, when Google is the only way in', async () => {
    renderSection([accountsMock(accounts({ has_password: false, google: GOOGLE }))]);

    expect(await screen.findByTestId('connected-google-hint')).toHaveTextContent(
      'Google is currently the only way to sign in to this account.',
    );
    expect(screen.queryByTestId('connected-google-action')).not.toBeInTheDocument();
  });

  it('connects Google with the credential and confirms it', async () => {
    const linked = accounts({ google: GOOGLE });
    renderSection([
      accountsMock(accounts()),
      {
        request: { query: CONNECT_GOOGLE_ACCOUNT, variables: { input: { id_token: 'google-id-token' } } },
        result: { data: { connectGoogleAccount: linked } },
      },
      accountsMock(linked),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'google-sign-in' }));

    expect(await screen.findByTestId('connected-toast-alert')).toHaveTextContent('Google connected');
    await waitFor(() => expect(screen.getByTestId('connected-google-value')).toHaveTextContent('meera@gmail.com'));
    expect(screen.queryByTestId('connected-error')).not.toBeInTheDocument();
  });

  it('shows why connecting failed', async () => {
    renderSection([
      accountsMock(accounts()),
      {
        request: { query: CONNECT_GOOGLE_ACCOUNT, variables: { input: { id_token: 'google-id-token' } } },
        result: { errors: [{ message: 'This Google account is linked to another user' }] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'google-sign-in' }));

    expect(await screen.findByTestId('connected-error')).toHaveTextContent(
      'This Google account is linked to another user',
    );
    expect(screen.queryByTestId('connected-toast-alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('connected-error')).not.toBeInTheDocument());
  });

  it('asks before disconnecting and does nothing when cancelled', async () => {
    renderSection([accountsMock(accounts({ google: GOOGLE }))]);

    fireEvent.click(await screen.findByTestId('connected-google-action'));
    expect(await screen.findByTestId('disconnect-google-confirm-title')).toHaveTextContent('Disconnect Google?');

    fireEvent.click(screen.getByTestId('disconnect-google-confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('disconnect-google-confirm')).not.toBeInTheDocument());
    expect(screen.getByTestId('connected-google-value')).toHaveTextContent('meera@gmail.com');
  });

  it('disconnects Google once confirmed', async () => {
    const unlinked = accounts();
    renderSection([
      accountsMock(accounts({ google: GOOGLE })),
      {
        request: { query: DISCONNECT_GOOGLE_ACCOUNT },
        result: { data: { disconnectGoogleAccount: unlinked } },
      },
      accountsMock(unlinked),
    ]);

    fireEvent.click(await screen.findByTestId('connected-google-action'));
    fireEvent.click(await screen.findByTestId('disconnect-google-confirm-confirm'));

    expect(await screen.findByTestId('connected-toast-alert')).toHaveTextContent('Google disconnected');
    await waitFor(() => expect(screen.queryByTestId('disconnect-google-confirm')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('connected-google-value')).toHaveTextContent('Not connected'));
  });

  it('closes the confirmation and shows the server’s refusal when disconnect fails', async () => {
    renderSection([
      accountsMock(accounts({ google: GOOGLE })),
      {
        request: { query: DISCONNECT_GOOGLE_ACCOUNT },
        result: { errors: [{ message: 'Set a password before disconnecting Google' }] },
      },
    ]);

    fireEvent.click(await screen.findByTestId('connected-google-action'));
    fireEvent.click(await screen.findByTestId('disconnect-google-confirm-confirm'));

    expect(await screen.findByTestId('connected-error')).toHaveTextContent('Set a password before disconnecting Google');
    await waitFor(() => expect(screen.queryByTestId('disconnect-google-confirm')).not.toBeInTheDocument());
    expect(screen.queryByTestId('connected-toast-alert')).not.toBeInTheDocument();
  });
});
