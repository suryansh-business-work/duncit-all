/**
 * A delete that rejects with something other than an Error still needs a
 * readable message — this is the one branch a real Apollo mock cannot reach,
 * since ApolloError always wraps a rejection as an Error instance. Bypasses
 * MockedProvider entirely, the same technique already used in
 * packages/shell/__tests__/JumpToPortalDialog-non-error.test.tsx.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import ContactActionsSection from '../ContactActionsSection';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useApolloClient: () => ({}),
  useMutation: () => [vi.fn().mockRejectedValue('offline'), { loading: false }],
}));

describe('ContactActionsSection delete failure with a non-Error rejection', () => {
  it('falls back to a generic message rather than crashing', async () => {
    __setTableRows([
      {
        id: 'ca-1',
        type: 'CALL',
        target: '+919000000001',
        subject: '',
        notes: '',
        status: 'CONNECTED',
        duration_seconds: 0,
        recording_url: '',
        created_at: '2026-02-01T10:00:00.000Z',
      },
    ]);
    render(<ContactActionsSection userId="u-contact-1" refreshToken={0} />);

    await waitFor(() => expect(screen.getByTestId('table-row')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'delete contact log' }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('Could not delete contact log'),
    );
  });
});
