import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  createFlagMock,
  deleteFlagMock,
  makeFeatureFlagRow,
  setFlagMock,
  updateFlagMock,
} from '../mocks/feature-flag.mock';

const m = vi.hoisted(() => ({
  notifyError: vi.fn(),
  confirmMock: vi.fn(),
  refetchSpy: vi.fn(),
  assignRefetch: true,
}));
vi.mock('@duncit/dialogs', () => ({ notifyError: m.notifyError, useConfirm: () => m.confirmMock }));
// The table's server fetch is irrelevant here (the child table is stubbed), so
// stub the fetch hook; the four mutations run for real against MockedProvider.
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));

// Rows are referenced inside the stubbed child (deferred), so a typed factory
// call at module scope is safe under vitest's vi.mock hoisting.
const rowOn = makeFeatureFlagRow({ id: 'f1', key: 'alpha', name: 'Alpha', description: 'a', enabled: true });
const rowOff = makeFeatureFlagRow({
  id: 'f2',
  key: 'beta',
  name: 'Beta',
  description: null as unknown as string,
  enabled: false,
});

vi.mock('../../src/pages/feature-flags-page/FeatureFlagsTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    toolbarActions?: React.ReactNode;
    onToggle: (r: typeof rowOn) => void;
    onEdit: (r: typeof rowOn) => void;
    onRemove: (r: typeof rowOn) => void;
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
vi.mock('../../src/pages/feature-flags-page/FlagEditDialog', () => ({
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

import FeatureFlagsPage from '../../src/pages/feature-flags-page/FeatureFlagsPage';

beforeEach(() => {
  m.notifyError.mockReset();
  m.confirmMock.mockReset();
  m.refetchSpy.mockReset();
  m.assignRefetch = true;
});

describe('FeatureFlagsPage', () => {
  it('toggles a flag on and off with the right toast', async () => {
    renderWithProviders(<FeatureFlagsPage />, { mocks: [setFlagMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'toggle-on' }));
    expect(await screen.findByText('Alpha disabled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'toggle-off' }));
    expect(await screen.findByText('Beta enabled')).toBeInTheDocument();
  });

  it('shows the mutation error as a toast when toggle fails', async () => {
    renderWithProviders(<FeatureFlagsPage />, { mocks: [setFlagMock({ error: 'toggle boom' })] });
    fireEvent.click(screen.getByRole('button', { name: 'toggle-on' }));
    expect(await screen.findByText('toggle boom')).toBeInTheDocument();
  });

  it('creates a flag from the New Flag dialog', async () => {
    renderWithProviders(<FeatureFlagsPage />, { mocks: [createFlagMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    expect(screen.getByTestId('flag-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('edits an existing flag (null description defaults to empty)', async () => {
    renderWithProviders(<FeatureFlagsPage />, { mocks: [updateFlagMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'edit-flag' }));
    expect(screen.getByTestId('flag-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('surfaces a save error inside the dialog', async () => {
    renderWithProviders(<FeatureFlagsPage />, { mocks: [createFlagMock({ error: 'save boom' })] });
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    fireEvent.click(screen.getByRole('button', { name: 'dlg-save' }));
    expect(await screen.findByText('err:save boom')).toBeInTheDocument();
  });

  it('closes the dialog', () => {
    renderWithProviders(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New Flag' }));
    fireEvent.click(screen.getByRole('button', { name: 'dlg-close' }));
    expect(screen.queryByTestId('flag-dialog')).not.toBeInTheDocument();
  });

  it('removes a flag after confirm and refetches', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<FeatureFlagsPage />, { mocks: [deleteFlagMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.refetchSpy).toHaveBeenCalled());
  });

  it('skips removal when confirm is declined', async () => {
    m.confirmMock.mockResolvedValue(false);
    renderWithProviders(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.refetchSpy).not.toHaveBeenCalled();
    expect(m.notifyError).not.toHaveBeenCalled();
  });

  it('reports a delete error via notifyError (null refetchRef)', async () => {
    m.assignRefetch = false;
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<FeatureFlagsPage />, { mocks: [deleteFlagMock({ error: 'del boom' })] });
    fireEvent.click(screen.getByRole('button', { name: 'remove-flag' }));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('del boom'));
  });
});
