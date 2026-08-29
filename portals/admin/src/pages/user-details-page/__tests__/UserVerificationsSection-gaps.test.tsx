/**
 * Closes gaps the broad `UserVerificationsSection.test.tsx` suite leaves:
 *
 * - Every row it uses is PENDING, APPROVED or VERIFIED_BY_APP, so
 *   `statusLabel`'s `?? status` fallback (an unrecognised status) never runs.
 * - Its ADDRESS rows always carry a populated `address`, so `detailValue` and
 *   `renderDetailCell`'s "no address at all" branch never runs.
 * - `ReviewCell` only ever sees APPROVED among the "already decided" rows, so
 *   the `=== 'REJECTED'` half of that OR is never independently evaluated —
 *   APPROVED short-circuits it every time.
 * The `onAct` catch's `e.message ?? 'Could not save review'` fallback for a
 * non-Error rejection is a separate gap, closed in
 * `UserVerificationsSection-non-error.test.tsx` — Apollo always wraps a
 * rejection as an Error, so that one needs `useMutation` replaced outright
 * (the same technique as `ContactActionsSection-non-error.test.tsx`), which
 * does not mix well with this file's normal MockedProvider-based tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import UserVerificationsSection from '../UserVerificationsSection';
import type { VerificationItem } from '../VerificationCells';
import { renderWithProviders } from './testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));

const USER_ID = 'u-9';

const row = (label: string) => {
  const found = screen
    .getAllByTestId('table-row')
    .find((node) => within(node).getByTestId('value-type').textContent === label);
  if (!found) throw new Error(`No verification row for ${label}`);
  return found;
};

beforeEach(() => {
  __setTableRows([]);
  vi.mocked(notifyError).mockClear();
});

describe('statusLabel / detailValue — values the broad suite never puts in a row', () => {
  it('falls back to the raw value for a status the map does not know', async () => {
    __setTableRows([
      { type: 'EMAIL', status: 'WEIRD_STATUS', document_url: null, address: null, reject_reason: null },
    ]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Email')).toBeInTheDocument());
    expect(within(row('Email')).getByTestId('value-status')).toHaveTextContent('WEIRD_STATUS');
  });

  it('shows the empty-detail dash for an ADDRESS row with no address at all', async () => {
    const noAddress: VerificationItem = {
      type: 'ADDRESS',
      status: 'PENDING',
      document_url: null,
      address: null,
      reject_reason: null,
    };
    __setTableRows([noAddress]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Address')).toBeInTheDocument());
    expect(within(row('Address')).getByTestId('value-details')).toHaveTextContent('—');
  });
});

describe('ReviewCell — a row that was rejected rather than approved', () => {
  it('goes quiet on a rejected row too, not only an approved one', async () => {
    const rejected: VerificationItem = {
      type: 'IDENTITY',
      status: 'REJECTED',
      document_url: 'https://cdn.test/doc.pdf',
      address: null,
      reject_reason: 'Blurry photo',
    };
    __setTableRows([rejected]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    expect(within(row('Identity')).getByText('No review needed')).toBeInTheDocument();
    expect(within(row('Identity')).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(row('Identity')).queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});
