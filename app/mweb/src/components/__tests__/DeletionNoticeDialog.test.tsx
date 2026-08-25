import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import DeletionNoticeDialog from '../DeletionNoticeDialog';
import {
  CANCEL_MY_ACCOUNT_DELETION_REQUEST,
  MY_ACCOUNT_DELETION_REQUEST,
} from '../../pages/account-page/security-queries';

const request = {
  __typename: 'AccountDeletionRequest',
  id: 'r1',
  request_id: 'DUN-ADR-1A2B3C',
  status: 'PENDING',
  requested_at: '2026-08-25T00:00:00.000Z',
  scheduled_delete_at: '2026-09-24T00:00:00.000Z',
  days_remaining: 30,
};

const pendingMock = {
  request: { query: MY_ACCOUNT_DELETION_REQUEST },
  result: { data: { myAccountDeletionRequest: request } },
};

const noneMock = {
  request: { query: MY_ACCOUNT_DELETION_REQUEST },
  result: { data: { myAccountDeletionRequest: null } },
};

const withdrawMock = {
  request: { query: CANCEL_MY_ACCOUNT_DELETION_REQUEST },
  result: {
    data: {
      cancelMyAccountDeletionRequest: { __typename: 'AccountDeletionRequest', id: 'r1', status: 'CANCELLED' },
    },
  },
};

function setup(mocks: unknown[]) {
  return render(
    <MockedProvider mocks={mocks as never[]}>
      <DuncitLocalizationProvider>
        <DeletionNoticeDialog />
      </DuncitLocalizationProvider>
    </MockedProvider>
  );
}

describe('DeletionNoticeDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('warns a returning member and names the date their account goes', async () => {
    setup([pendingMock]);
    await waitFor(() => expect(screen.getByTestId('deletion-notice')).toBeInTheDocument());
    expect(screen.getByTestId('deletion-notice-withdraw')).toBeInTheDocument();
    expect(screen.getByText(/DUN-ADR-1A2B3C/)).toBeInTheDocument();
  });

  it('stays out of the way when there is no open request', async () => {
    setup([noneMock]);
    await waitFor(() => expect(screen.queryByTestId('deletion-notice')).toBeNull());
  });

  it('withdraws the request and closes', async () => {
    setup([pendingMock, withdrawMock, noneMock]);
    await waitFor(() => expect(screen.getByTestId('deletion-notice')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('deletion-notice-withdraw'));
    await waitFor(() => expect(screen.queryByTestId('deletion-notice')).toBeNull());
  });

  it('asks once per session — dismissing marks it seen', async () => {
    const first = setup([pendingMock]);
    await waitFor(() => expect(screen.getByTestId('deletion-notice')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('deletion-notice-keep'));
    await waitFor(() => expect(screen.queryByTestId('deletion-notice')).toBeNull());
    first.unmount();

    setup([pendingMock]);
    await waitFor(() => expect(screen.queryByTestId('deletion-notice')).toBeNull());
  });
});
