import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject, ReactNode } from 'react';
import type { ApiKeyRow } from '../../src/pages/api-keys/queries';

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

const sample: ApiKeyRow = {
  id: 'k9',
  name: 'Sample',
  key_prefix: 'dk_x',
  scopes: ['venues:read'],
  last_used_at: null,
  revoked_at: null,
  created_at: '2026-02-02',
};

vi.mock('../../src/pages/api-keys/ApiKeysTable', () => ({
  default: ({
    toolbarActions,
    onRevoke,
    refetchRef,
  }: {
    toolbarActions?: ReactNode;
    onRevoke: (k: ApiKeyRow) => void;
    refetchRef: MutableRefObject<(() => void) | null>;
  }) => (
    <div>
      {toolbarActions}
      <button type="button" onClick={() => onRevoke(sample)}>
        row-revoke
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

vi.mock('../../src/pages/api-keys/CreateKeyDialog', () => ({
  default: ({
    open,
    rawKey,
    error,
    onCreate,
    onClose,
  }: {
    open: boolean;
    rawKey: string | null;
    error: string | null;
    onCreate: (name: string) => void;
    onClose: () => void;
  }) =>
    open ? (
      <div>
        <span data-testid="raw-key">{rawKey ?? 'none'}</span>
        <span data-testid="dlg-error">{error ?? 'no-error'}</span>
        <button type="button" onClick={() => onCreate('New Key')}>
          dlg-create
        </button>
        <button type="button" onClick={onClose}>
          dlg-close
        </button>
      </div>
    ) : null,
}));

import ApiKeysPage from '../../src/pages/api-keys/ApiKeysPage';
import { CREATE_API_KEY } from '../../src/pages/api-keys/queries';

const createFn = vi.fn();
const revokeFn = vi.fn();

describe('ApiKeysPage', () => {
  beforeEach(() => {
    createFn.mockReset();
    revokeFn.mockReset();
    refetchSpy.mockReset();
    // Stable per-document mapping so re-renders keep returning the same tuple.
    useMutationMock.mockReset().mockImplementation((doc: unknown) =>
      doc === CREATE_API_KEY ? [createFn, { loading: false }] : [revokeFn, { loading: false }],
    );
    useApolloClientMock.mockReset().mockReturnValue({ mock: 'client' });
    useApolloTableFetchMock.mockReset().mockReturnValue(vi.fn());
  });

  it('builds the table fetcher from the apollo client + table query', () => {
    render(<ApiKeysPage />);
    expect(useApolloTableFetchMock).toHaveBeenCalledWith(
      { mock: 'client' },
      expect.anything(),
      'myApiKeysTable',
    );
  });

  it('opens the create dialog and closes it (clearing the raw key)', () => {
    render(<ApiKeysPage />);
    expect(screen.queryByTestId('raw-key')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Create key'));
    expect(screen.getByTestId('raw-key')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('dlg-close'));
    expect(screen.queryByTestId('raw-key')).not.toBeInTheDocument();
  });

  it('creates a key, reveals the raw key and refetches the table', async () => {
    createFn.mockResolvedValue({ data: { createApiKey: { raw_key: 'dk_live_secret' } } });
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('Create key'));
    fireEvent.click(screen.getByText('dlg-create'));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ variables: { name: 'New Key' } }));
    await waitFor(() => expect(screen.getByTestId('raw-key')).toHaveTextContent('dk_live_secret'));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to null raw key when the mutation returns no data', async () => {
    createFn.mockResolvedValue({ data: undefined });
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByText('Create key'));
    fireEvent.click(screen.getByText('dlg-create'));
    await waitFor(() => expect(createFn).toHaveBeenCalled());
    expect(screen.getByTestId('raw-key')).toHaveTextContent('none');
    // no refetch registered → the optional-chain call is a no-op.
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces a create error in the alert + dialog', async () => {
    createFn.mockRejectedValue(new Error('create failed'));
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByText('Create key'));
    fireEvent.click(screen.getByText('dlg-create'));
    await waitFor(() => expect(screen.getByTestId('dlg-error')).toHaveTextContent('create failed'));
    expect(screen.getByRole('alert')).toHaveTextContent('create failed');
  });

  it('revokes a key and refetches the table', async () => {
    revokeFn.mockResolvedValue({});
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('row-revoke'));
    await waitFor(() => expect(revokeFn).toHaveBeenCalledWith({ variables: { id: 'k9' } }));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('surfaces a revoke error', async () => {
    revokeFn.mockRejectedValue(new Error('revoke failed'));
    render(<ApiKeysPage />);
    fireEvent.click(screen.getByText('row-revoke'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('revoke failed'));
    expect(refetchSpy).not.toHaveBeenCalled();
  });
});
