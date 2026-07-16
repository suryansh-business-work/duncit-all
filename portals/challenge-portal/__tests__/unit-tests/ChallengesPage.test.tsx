import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject, ReactNode } from 'react';

const useMutationMock = vi.hoisted(() => vi.fn());
const useApolloClientMock = vi.hoisted(() => vi.fn());
const useApolloTableFetchMock = vi.hoisted(() => vi.fn());
const refetchSpy = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: useMutationMock,
  useApolloClient: useApolloClientMock,
}));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: useApolloTableFetchMock }));

const sample = {
  id: 'c9',
  name: 'Sample Challenge',
  description: null,
  is_active: true,
  created_at: '2026-02-02',
};

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
      <button type="button" onClick={() => {
        refetchRef.current = refetchSpy;
      }}>
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

const deleteFn = vi.fn();
let deleteState: { loading: boolean };

describe('ChallengesPage', () => {
  beforeEach(() => {
    deleteFn.mockReset().mockResolvedValue({});
    refetchSpy.mockReset();
    deleteState = { loading: false };
    useMutationMock.mockReset().mockReturnValue([deleteFn, deleteState]);
    useApolloClientMock.mockReset().mockReturnValue({ mock: 'client' });
    useApolloTableFetchMock.mockReset().mockReturnValue(vi.fn());
  });

  it('builds the table fetcher from the apollo client + table query', () => {
    render(<ChallengesPage />);
    expect(useApolloTableFetchMock).toHaveBeenCalledWith(
      { mock: 'client' },
      expect.anything(),
      'challengesTable',
    );
  });

  it('opens a blank form via "New challenge" and closes it', () => {
    render(<ChallengesPage />);
    expect(screen.queryByTestId('form-editing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('New challenge'));
    expect(screen.getByTestId('form-editing')).toHaveTextContent('new');
    fireEvent.click(screen.getByText('form-close'));
    expect(screen.queryByTestId('form-editing')).not.toBeInTheDocument();
  });

  it('opens the form pre-loaded when editing a row', () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('form-editing')).toHaveTextContent('Sample Challenge');
  });

  it('onSaved calls the registered table refetch', () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('New challenge'));
    fireEvent.click(screen.getByText('form-saved'));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('onSaved is a no-op when no refetch has been registered', () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('New challenge'));
    fireEvent.click(screen.getByText('form-saved'));
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and refetches the table', async () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('row-delete'));
    expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteFn).toHaveBeenCalledWith({ variables: { id: 'c9' } }));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument());
  });

  it('deletes even when no refetch is registered', async () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteFn).toHaveBeenCalledTimes(1));
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('Cancel dismisses the delete dialog without deleting', async () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() =>
      expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument(),
    );
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('closes the delete dialog on Escape (backdrop/onClose path)', async () => {
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.keyDown(screen.getByText(/Permanently delete/), { key: 'Escape', code: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText(/Permanently delete/)).not.toBeInTheDocument(),
    );
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('shows the deleting state on the confirm button while the mutation runs', () => {
    deleteState = { loading: true };
    useMutationMock.mockReturnValue([deleteFn, deleteState]);
    render(<ChallengesPage />);
    fireEvent.click(screen.getByText('row-delete'));
    expect(screen.getByText('Deleting…')).toBeInTheDocument();
    expect(screen.getByText('Deleting…').closest('button')).toBeDisabled();
  });
});
