/**
 * A review that rejects with something other than an Error still needs a
 * readable message — this is the one branch a real Apollo mock cannot reach,
 * since ApolloError always wraps a rejection as an Error instance. Bypasses
 * MockedProvider entirely, the same technique as
 * `ContactActionsSection-non-error.test.tsx` in this directory.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import UserVerificationsSection from '../UserVerificationsSection';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useApolloClient: () => ({}),
  useMutation: () => [vi.fn().mockRejectedValue('offline'), { loading: false }],
}));

describe('UserVerificationsSection review failure with a non-Error rejection', () => {
  it('falls back to a generic message rather than reading `undefined`', async () => {
    __setTableRows([
      {
        type: 'IDENTITY',
        status: 'PENDING',
        document_url: 'https://cdn.test/doc.pdf',
        address: null,
        reject_reason: null,
      },
    ]);
    render(<UserVerificationsSection userId="u-9" />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not save review'));
  });
});
