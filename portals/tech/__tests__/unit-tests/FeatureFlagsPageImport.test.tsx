import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  resetStore: vi.fn(),
  refetch: vi.fn(),
  assignRefetch: true,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useApolloClient: () => ({ resetStore: m.resetStore }),
    useMutation: () => [vi.fn(), { loading: false }] as const,
  };
});
vi.mock('@duncit/dialogs', () => ({ notifyError: vi.fn(), useConfirm: () => vi.fn() }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('../../src/pages/feature-flags-page/FeatureFlagsTable', () => ({
  default: (p: { refetchRef: { current: (() => void) | null } }) => {
    if (m.assignRefetch) p.refetchRef.current = m.refetch;
    return null;
  },
}));
vi.mock('../../src/pages/feature-flags-page/FlagEditDialog', () => ({ default: () => null }));
vi.mock('../../src/pages/feature-flags-page/FlagImportExport', () => ({
  default: (p: { onImported: () => void }) => (
    <button type="button" onClick={p.onImported}>
      imported
    </button>
  ),
}));

import FeatureFlagsPage from '../../src/pages/feature-flags-page/FeatureFlagsPage';

beforeEach(() => {
  vi.clearAllMocks();
  m.assignRefetch = true;
  m.resetStore.mockResolvedValue([]);
});

describe('FeatureFlagsPage import', () => {
  it('drops the whole cache and reloads the table once flags are imported', () => {
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    expect(m.resetStore).toHaveBeenCalledTimes(1);
    expect(m.refetch).toHaveBeenCalledTimes(1);
  });

  it('still reloads the table when the cache reset is rejected', async () => {
    m.resetStore.mockRejectedValue(new Error('store busy'));
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    await waitFor(() => expect(m.refetch).toHaveBeenCalled());
  });

  it('survives an import signalled before the table has registered its refetch', () => {
    m.assignRefetch = false;
    render(<FeatureFlagsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    expect(m.resetStore).toHaveBeenCalledTimes(1);
    expect(m.refetch).not.toHaveBeenCalled();
  });
});
