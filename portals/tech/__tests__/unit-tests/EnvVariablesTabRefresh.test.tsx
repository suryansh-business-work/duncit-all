import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { logs } from '@duncit/logs';
import { makeEmailCategoryDef, makeEnvEntry } from '../mocks/env-entry.mock';

const m = vi.hoisted(() => ({
  refetchQueries: vi.fn(),
  refetchTable: vi.fn(),
  categories: [] as unknown[],
}));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: () => ({ data: { envCategories: m.categories } }),
  useMutation: () => [vi.fn(), { loading: false }] as const,
  useApolloClient: () => ({ refetchQueries: m.refetchQueries, resetStore: vi.fn() }),
}));
vi.mock('@duncit/dialogs', () => ({ notify: vi.fn(), notifyError: vi.fn(), useConfirm: () => vi.fn() }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('../../src/pages/environment/EnvEntriesTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    onTest: (entry: unknown) => void;
    onHistory?: (entry: unknown) => void;
  }) => {
    p.refetchRef.current = m.refetchTable;
    return (
      <>
        <button type="button" onClick={() => p.onTest(makeEnvEntry({ id: 'a', name: 'Primary' }))}>
          test the row
        </button>
        <button type="button" onClick={() => p.onHistory?.(makeEnvEntry({ id: 'a', name: 'Primary' }))}>
          history of the row
        </button>
      </>
    );
  },
}));
vi.mock('../../src/pages/environment/EnvImportExport', () => ({ default: () => null }));
vi.mock('../../src/pages/environment/env-entry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/pages/environment/env-entry')>()),
  EnvEntryForm: () => null,
}));
vi.mock('../../src/pages/environment/test-panels', () => ({
  default: (p: { entry: { name: string } | null; onTested: () => void }) =>
    p.entry ? (
      <button type="button" onClick={p.onTested}>
        {`finish test of ${p.entry.name}`}
      </button>
    ) : null,
}));

import EnvVariablesTab from '../../src/pages/environment/EnvVariablesTab';

beforeEach(() => {
  vi.clearAllMocks();
  m.categories = [makeEmailCategoryDef()];
  m.refetchQueries.mockResolvedValue([]);
});

const finishATest = async () => {
  render(
    <MemoryRouter>
      <EnvVariablesTab />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'test the row' }));
  fireEvent.click(await screen.findByRole('button', { name: 'finish test of Primary' }));
};

describe('EnvVariablesTab / test history', () => {
  it('opens the test history of a row and closes it again', async () => {
    render(
      <MemoryRouter>
        <EnvVariablesTab />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'history of the row' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Primary');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('EnvVariablesTab / after a connection test', () => {
  it('reloads the table and asks Apollo to refresh the overview counts and the test history', async () => {
    await finishATest();

    await waitFor(() => expect(m.refetchQueries).toHaveBeenCalledWith({ include: ['EnvOverview', 'EnvTestHistory'] }));
    expect(m.refetchTable).toHaveBeenCalledTimes(1);
  });

  it('logs a count refresh that fails, and still reloads the table', async () => {
    const error = vi.spyOn(logs.portal.tech, 'error').mockImplementation(() => undefined);
    m.refetchQueries.mockRejectedValue(new Error('network down'));

    await finishATest();

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('EnvVariablesTab', 'refreshCounts', { reason: 'network down' }),
    );
    expect(m.refetchTable).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
