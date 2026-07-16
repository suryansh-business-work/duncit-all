import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FeatureFlagRow } from './queries';

const m = vi.hoisted(() => ({
  run: vi.fn(),
  notifyError: vi.fn(),
  confirmMock: vi.fn(),
  refetchSpy: vi.fn(),
  assignRefetch: true,
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useApolloClient: () => ({}), useMutation: () => [m.run, { loading: false }] as const };
});
vi.mock('@duncit/dialogs', () => ({ notifyError: m.notifyError, useConfirm: () => m.confirmMock }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));

const rowOn: FeatureFlagRow = { id: 'f1', key: 'alpha', name: 'Alpha', description: 'a', enabled: true } as FeatureFlagRow;
const rowOff: FeatureFlagRow = { id: 'f2', key: 'beta', name: 'Beta', description: null as unknown as string, enabled: false } as FeatureFlagRow;

vi.mock('./FeatureFlagsTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    toolbarActions?: React.ReactNode;
    onToggle: (r: FeatureFlagRow) => void;
    onEdit: (r: FeatureFlagRow) => void;
    onRemove: (r: FeatureFlagRow) => void;
  }) => {
    if (m.assignRefetch) p.refetchRef.current = m.refetchSpy;
    return (
      <div>
        {p.toolbarActions}
        <button type="button" onClick={() => p.onToggle(rowOn)}>toggle-on</button>
        <button type="button" onClick={() => p.onToggle(rowOff)}>toggle-off</button>
        <button type="button" onClick={() => p.onEdit(rowOff)}>edit-flag</button>
        <button type="button" onClick={() => p.onRemove(rowOn)}>remove-flag</button>
      </div>
    );
  },
}));
vi.mock('./FlagEditDialog', () => ({
  default: (p: { open: boolean; opError: string | null; busy: boolean; onSave: () => void; onClose: () => void }) =>
    p.open ? (
      <div data-testid="flag-dialog">
        {p.opError && <span>err:{p.opError}</span>}
        {p.busy && <span>busy</span>}
        <button type="button" onClick={p.onSave}>dlg-save</button>
        <button type="button" onClick={p.onClose}>dlg-close</button>
      </div>
    ) : null,
}));

import FeatureFlagsPage from './FeatureFlagsPage';

beforeEach(() => {
  m.run.mockReset();
  m.run.mockResolvedValue({ data: {} });
  m.notifyError.mockReset();
  m.confirmMock.mockReset();
  m.refetchSpy.mockReset();
  m.assignRefetch = true;
});

describe('FeatureFlagsPage', () => {
  it('toggles a flag on and off with the right toast', async () => {
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'toggle-on' }));
    expect(await screen.findByText('Alpha disabled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'toggle-off' }));
    expect(await screen.findByText('Beta enabled')).toBeInTheDocument();
  });

  it('shows the mutation error as a toast when toggle fails', async () => {
    m.run.mockRejectedValue(new Error('toggle boom'));
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'toggle-on' }));
    expect(await screen.findByText('toggle boom')).toBeInTheDocument();
  });

  it('creates a flag from the New Flag dialog', async () => {
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    expect(screen.getByTestId('flag-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('edits an existing flag (null description defaults to empty)', async () => {
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'edit-flag' }));
    expect(screen.getByTestId('flag-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('surfaces a save error inside the dialog', async () => {
    m.run.mockRejectedValue(new Error('save boom'));
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('err:save boom')).toBeInTheDocument();
  });

  it('closes the dialog', () => {
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    fireEvent.click(screen.getByRole('button', { name: 'dlg-close' }));
    expect(screen.queryByTestId('flag-dialog')).not.toBeInTheDocument();
  });

  it('removes a flag after confirm and refetches', async () => {
    m.confirmMock.mockResolvedValue(true);
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.refetchSpy).toHaveBeenCalled());
  });

  it('skips removal when confirm is declined', async () => {
    m.confirmMock.mockResolvedValue(false);
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.run).not.toHaveBeenCalled();
  });

  it('reports a delete error via notifyError (null refetchRef)', async () => {
    m.assignRefetch = false;
    m.confirmMock.mockResolvedValue(true);
    m.run.mockRejectedValue(new Error('del boom'));
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('del boom'));
  });
});
