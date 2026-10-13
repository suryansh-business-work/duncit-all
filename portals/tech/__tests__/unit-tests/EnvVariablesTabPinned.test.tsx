import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { makeEnvCategoryDef } from '../mocks/env-entry.mock';

const m = vi.hoisted(() => ({
  resetStore: vi.fn(),
  refetch: vi.fn(),
  categories: [] as unknown[],
  importProps: null as null | { category: string; categoryLabel: string },
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: () => ({ data: { envCategories: m.categories } }),
    useMutation: () => [vi.fn(), { loading: false }] as const,
    useApolloClient: () => ({ resetStore: m.resetStore }),
  };
});
vi.mock('@duncit/dialogs', () => ({ notify: vi.fn(), useConfirm: () => vi.fn() }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('../../src/pages/environment/EnvEntriesTable', () => ({
  default: (p: { refetchRef: { current: (() => void) | null } }) => {
    p.refetchRef.current = m.refetch;
    return <div data-testid="env-table" />;
  },
}));
vi.mock('../../src/pages/environment/EnvImportExport', () => ({
  default: (p: { category: string; categoryLabel: string; onImported: () => void }) => {
    m.importProps = { category: p.category, categoryLabel: p.categoryLabel };
    return (
      <button type="button" onClick={p.onImported}>
        imported
      </button>
    );
  },
}));
vi.mock('../../src/pages/environment/env-entry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/pages/environment/env-entry')>();
  return { ...actual, EnvEntryForm: () => null };
});
vi.mock('../../src/pages/environment/test-panels', () => ({ default: () => null }));

import EnvVariablesTab from '../../src/pages/environment/EnvVariablesTab';

const email = makeEnvCategoryDef({ category: 'EMAIL', label: 'Email' });
const twilio = makeEnvCategoryDef({ category: 'TWILIO', label: 'Twilio' });

const renderTab = (props: { category?: 'EMAIL' | 'TWILIO' } = {}) =>
  render(
    <MemoryRouter>
      <EnvVariablesTab {...props} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.categories = [email, twilio];
  m.resetStore.mockResolvedValue([]);
  m.importProps = null;
});

describe('EnvVariablesTab import and pinned category', () => {
  it('drops the whole cache and reloads the table after an import', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    expect(m.resetStore).toHaveBeenCalledTimes(1);
    expect(m.refetch).toHaveBeenCalledTimes(1);
    expect(m.importProps).toEqual({ category: 'EMAIL', categoryLabel: 'Email' });
  });

  it('still reloads the table when resetting the cache fails', async () => {
    m.resetStore.mockRejectedValue(new Error('store busy'));
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    await vi.waitFor(() => expect(m.refetch).toHaveBeenCalled());
  });

  it('pins one category: no tab strip and the import targets that category', () => {
    renderTab({ category: 'TWILIO' });
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(m.importProps).toEqual({ category: 'TWILIO', categoryLabel: 'Twilio' });
  });

  it('shows a tab strip for every category when nothing is pinned', () => {
    renderTab();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
