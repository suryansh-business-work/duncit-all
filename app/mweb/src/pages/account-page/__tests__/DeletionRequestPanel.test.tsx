import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ACCOUNT_DELETION_REVOKE_REASON } from '@duncit/user-core';

import DeletionRequestPanel from '../DeletionRequestPanel';
import {
  ACCOUNT_DELETION_SETTINGS,
  CANCEL_MY_ACCOUNT_DELETION_REQUEST,
  MY_ACCOUNT_DELETION_REQUEST,
  REQUEST_ACCOUNT_DELETION_OTP,
} from '../security-queries';

const h = vi.hoisted(() => ({ logout: vi.fn(), release: vi.fn() }));

vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ logout: h.logout }) }));
vi.mock('@duncit/user-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-core')>()),
  releaseSessionRevoked: h.release,
}));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  formatDate: (d: string) => `day:${d}`,
}));
// The OTP step has its own form and mutations; here it only has to hand a filed
// request back, which is the contract this panel depends on.
vi.mock('../DeleteAccountDialog', () => ({
  default: ({ open, onClose, onSubmitted }: any) =>
    open ? (
      <div data-testid="otp-step">
        <button type="button" onClick={onClose}>
          close-otp
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmitted({
              id: 'req-doc-9',
              request_id: 'DEL-9001',
              status: 'PENDING',
              requested_at: '2026-10-03T08:00:00.000Z',
              scheduled_delete_at: '2026-11-02T08:00:00.000Z',
              days_remaining: 30,
            })
          }
        >
          file-request
        </button>
      </div>
    ) : null,
}));

const PENDING = {
  id: 'req-doc-1',
  request_id: 'DEL-1234',
  status: 'PENDING',
  requested_at: '2026-09-20T08:00:00.000Z',
  scheduled_delete_at: '2026-10-20T08:00:00.000Z',
  days_remaining: 17,
};

const requestMock = (pending: unknown): MockedResponse => ({
  request: { query: MY_ACCOUNT_DELETION_REQUEST },
  result: { data: { myAccountDeletionRequest: pending } },
});

const settingsMock = (retentionDays: number | null): MockedResponse => ({
  request: { query: ACCOUNT_DELETION_SETTINGS },
  result: {
    data: {
      accountDeletionSettings: retentionDays === null ? null : { retention_days: retentionDays },
    },
  },
});

function renderPanel(mocks: MockedResponse[]) {
  const onToast = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <DeletionRequestPanel onToast={onToast} />
    </MockedProvider>,
  );
  return { onToast };
}

beforeEach(() => {
  h.logout.mockReset();
  h.release.mockReset();
});

describe('DeletionRequestPanel — no open request', () => {
  it('offers the request button and quotes the configured retention window', async () => {
    renderPanel([requestMock(null), settingsMock(30)]);

    const open = await screen.findByTestId('open-delete-account');
    expect(open).toHaveTextContent('Request account deletion');
    expect(screen.queryByTestId('deletion-pending')).not.toBeInTheDocument();

    fireEvent.click(open);
    // The copy follows the settings query once it lands.
    await waitFor(() =>
      expect(screen.getByTestId('confirm-dialog')).toHaveTextContent('deleted 30 days from now'),
    );
    expect(screen.getByTestId('confirm-dialog-title')).toHaveTextContent('Request account deletion?');
  });

  it('falls back to the sealed copy when no retention window is configured', async () => {
    renderPanel([requestMock(null), settingsMock(null)]);
    fireEvent.click(await screen.findByTestId('open-delete-account'));
    expect(await screen.findByTestId('confirm-dialog')).toHaveTextContent(
      'This cannot be undone from the app.',
    );
  });

  it('sends the code, swaps the confirmation for the OTP step, then signs out after filing', async () => {
    renderPanel([
      requestMock(null),
      settingsMock(30),
      {
        request: { query: REQUEST_ACCOUNT_DELETION_OTP },
        result: { data: { requestAccountDeletionOtp: { ok: true } } },
      },
    ]);
    fireEvent.click(await screen.findByTestId('open-delete-account'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByTestId('otp-step')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'file-request' }));
    expect(screen.queryByTestId('otp-step')).not.toBeInTheDocument();
    const submitted = await screen.findByTestId('deletion-submitted');
    expect(submitted).toHaveTextContent('day:2026-11-02T08:00:00.000Z');
    expect(submitted).toHaveTextContent('Reference DEL-9001');

    fireEvent.click(screen.getByTestId('deletion-sign-out'));
    expect(h.release).toHaveBeenCalledWith(ACCOUNT_DELETION_REVOKE_REASON);
    expect(h.logout).toHaveBeenCalledTimes(1);
  });

  it('closes the OTP step without filing anything', async () => {
    renderPanel([
      requestMock(null),
      settingsMock(30),
      {
        request: { query: REQUEST_ACCOUNT_DELETION_OTP },
        result: { data: { requestAccountDeletionOtp: { ok: true } } },
      },
    ]);
    fireEvent.click(await screen.findByTestId('open-delete-account'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    fireEvent.click(await screen.findByRole('button', { name: 'close-otp' }));

    expect(screen.queryByTestId('otp-step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deletion-submitted')).not.toBeInTheDocument();
    expect(h.logout).not.toHaveBeenCalled();
  });

  it('shows the server error when the code cannot be sent, and the error can be dismissed', async () => {
    renderPanel([
      requestMock(null),
      settingsMock(30),
      {
        request: { query: REQUEST_ACCOUNT_DELETION_OTP },
        result: { errors: [{ message: 'Too many codes requested' }] },
      },
    ]);
    fireEvent.click(await screen.findByTestId('open-delete-account'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Too many codes requested')).toBeInTheDocument();
    expect(screen.queryByTestId('otp-step')).not.toBeInTheDocument();
    // The confirmation stays up so the member can retry or back out.
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Too many codes requested');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Too many codes requested')).not.toBeInTheDocument());
  });

  it('closes the confirmation from Cancel without sending a code', async () => {
    renderPanel([requestMock(null), settingsMock(30)]);
    fireEvent.click(await screen.findByTestId('open-delete-account'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('otp-step')).not.toBeInTheDocument();
  });
});

describe('DeletionRequestPanel — open request', () => {
  it('replaces the button with the pending banner carrying the date and reference', async () => {
    renderPanel([requestMock(PENDING), settingsMock(30)]);

    const banner = await screen.findByTestId('deletion-pending');
    expect(banner).toHaveTextContent('Deletion requested');
    expect(banner).toHaveTextContent('Your account will be deleted on day:2026-10-20T08:00:00.000Z');
    expect(banner).toHaveTextContent('Reference DEL-1234');
    expect(banner).toHaveTextContent('Requested on day:2026-09-20T08:00:00.000Z');
    expect(screen.queryByTestId('open-delete-account')).not.toBeInTheDocument();
    expect(screen.getByTestId('withdraw-deletion')).toHaveTextContent('Withdraw request');
  });

  it('withdraws the request, re-reads it and confirms with a toast', async () => {
    const { onToast } = renderPanel([
      requestMock(PENDING),
      settingsMock(30),
      {
        request: { query: CANCEL_MY_ACCOUNT_DELETION_REQUEST },
        result: { data: { cancelMyAccountDeletionRequest: { id: 'req-doc-1', status: 'CANCELLED' } } },
      },
      requestMock(null),
    ]);
    fireEvent.click(await screen.findByTestId('withdraw-deletion'));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Deletion request withdrawn.'));
    // The refetch found no open request, so the panel is back to the button.
    expect(await screen.findByTestId('open-delete-account')).toBeInTheDocument();
    expect(screen.queryByTestId('deletion-pending')).not.toBeInTheDocument();
  });

  it('keeps the banner and shows why when the withdrawal fails', async () => {
    const { onToast } = renderPanel([
      requestMock(PENDING),
      settingsMock(30),
      {
        request: { query: CANCEL_MY_ACCOUNT_DELETION_REQUEST },
        result: { errors: [{ message: 'Request already processed' }] },
      },
    ]);
    fireEvent.click(await screen.findByTestId('withdraw-deletion'));

    expect(await screen.findByText('Request already processed')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
    expect(screen.getByTestId('deletion-pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Request already processed')).not.toBeInTheDocument());
  });
});
