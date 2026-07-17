import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject, ReactNode } from 'react';
import { renderWithProviders } from '../testkit';
import { makeChallenge, deleteChallengeMock, challengeStatsMock } from '../mocks';

const refetchSpy = vi.hoisted(() => vi.fn());

// @duncit/table's fetch hook is a passthrough here — the mocked child table
// never invokes it, so it only needs to be a stable no-op function.
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));

const sample = makeChallenge({ id: 'c9', name: 'Sample Challenge', description: null });

vi.mock('../../src/pages/challenges/ChallengesTable', () => ({
  default: ({
    toolbarActions,
    onEdit,
    onDelete,
    refetchRef,
  }: {
    toolbarActions?: ReactNode;
    onEdit: (c: typeof sample) => void;
    onDelete: (c: typeof sample) => void;
    refetchRef: MutableRefObject<(() => void) | null>;
  }) => (
    <div>
      {toolbarActions}
      <button type="button" onClick={() => onEdit(sample)}>
        row-edit
      </button>
      <button type="button" onClick={() => onDelete(sample)}>
        row-delete
      </button>
      <button
        type="button"
        onClick={() => {
          refetchRef.current = refetchSpy;
        }}
      >
        set-refetch
      </button>
    </div>
  ),
}));

vi.mock('../../src/pages/challenges/ChallengeFormDialog', () => ({
  default: ({
    open,
    editing,
    onClose,
    onSaved,
  }: {
    open: boolean;
    editing: { name: string } | null;
    onClose: () => void;
    onSaved?: () => void;
  }) =>
    open ? (
      <div>
        <span data-testid="form-editing">{editing ? editing.name : 'new'}</span>
        <button type="button" onClick={onSaved}>
          form-saved
        </button>
        <button type="button" onClick={onClose}>
          form-close
        </button>
      </div>
    ) : null,
}));

import ChallengesPage from '../../src/pages/challenges/ChallengesPage';

const deleteMocks = (delay?: number) => [
  deleteChallengeMock({ id: 'c9', delay }),
  challengeStatsMock(),
];

describe('ChallengesPage', () => {
  beforeEach(() => {
    refetchSpy.mockReset();
  });

  it('opens a blank form via "New challenge" and closes it', () => {
    renderWithProviders(<ChallengesPage />);
    expect(screen.queryByTestId('form-editing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('New challenge'));
    expect(screen.getByTestId('form-editing')).toHaveTextContent('new');
    fireEvent.click(screen.getByText('form-close'));
    expect(screen.queryByTestId('form-editing')).not.toBeInTheDocument();
  });

  it('opens the form pre-loaded when editing a row', () => {
    renderWithProviders(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('form-editing')).toHaveTextContent('Sample Challenge');
  });

  it('onSaved calls the registered table refetch', () => {
    renderWithProviders(<ChallengesPage />);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('New challenge'));
    fireEvent.click(screen.getByText('form-saved'));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('onSaved is a no-op when no refetch has been registered', () => {
    renderWithProviders(<ChallengesPage />);
    fireEvent.click(screen.getByText('New challenge'));
    fireEvent.click(screen.getByText('form-saved'));
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and refetches the table', async () => {
    renderWithProviders(<ChallengesPage />, { mocks: deleteMocks() });
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('row-delete'));
    expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('deletes even when no refetch is registered', async () => {
    renderWithProviders(<ChallengesPage />, { mocks: deleteMocks() });
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('Cancel dismisses the delete dialog without deleting', async () => {
    renderWithProviders(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
  });

  it('closes the delete dialog on Escape (backdrop/onClose path)', async () => {
    renderWithProviders(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.keyDown(screen.getByText(/Permanently delete/), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
  });

  it('shows the deleting state on the confirm button while the mutation runs', async () => {
    renderWithProviders(<ChallengesPage />, { mocks: deleteMocks(60) });
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(screen.getByText('Delete'));
    // The delayed mock keeps the mutation in flight long enough to observe it.
    const deleting = await screen.findByText('Deleting…');
    expect(deleting.closest('button')).toBeDisabled();
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
  });
});
