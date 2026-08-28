import { describe, expect, it, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import TranslationEntriesTable from '../TranslationEntriesTable';
import { TRANSLATIONS_TABLE, type LocaleRow, type TranslationRow } from '../queries';

// The real table renders through AG Grid (needs a layout engine jsdom lacks),
// and useApolloTableFetch is built internally rather than injected as a prop —
// the shared table-mock's stub `useApolloTableFetch` ignores the client/query
// entirely, which would hide whether this component wires the real Apollo
// query and its externalFilters correctly. This local mock keeps the grid a
// stub but round-trips fetchRows through the real MockedProvider client.
vi.mock('@duncit/table', () => import('./translation-table-mock'));

afterEach(() => {
  vi.restoreAllMocks();
});

const makeLocale = (over: Partial<LocaleRow> = {}): LocaleRow => ({
  id: 'loc1',
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: 'Hindi',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
  updated_at: null,
  ...over,
});

const makeApiRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'TranslationRow',
  id: 'row1',
  key: 'admin.foo.bar',
  surface: 'mweb',
  page: 'shop',
  description: 'A hint',
  values: [{ __typename: 'TranslationValueEntry', key: 'en-IN', value: 'Hello' }],
  updated_at: '2026-01-02T00:00:00.000Z',
  ...over,
});

const tableMock = (rows: unknown[], total = rows.length): MockedResponse => ({
  request: { query: TRANSLATIONS_TABLE },
  variableMatcher: () => true,
  result: {
    data: {
      translationsTable: {
        __typename: 'TranslationsTablePage',
        total,
        page: 1,
        page_size: 25,
        rows,
      },
    },
  },
});

interface RenderArgs {
  rows?: unknown[];
  locales?: LocaleRow[];
  onOpen?: (row: TranslationRow) => void;
  mocks?: MockedResponse[];
}

const renderTable = ({ rows = [makeApiRow()], locales = [makeLocale()], onOpen = vi.fn(), mocks }: RenderArgs = {}) => {
  const refetchRef = createRef<(() => void) | null>() as { current: (() => void) | null };
  refetchRef.current = null;
  const view = renderWithProviders(
    <TranslationEntriesTable
      surface="mweb"
      page="shop"
      locales={locales}
      formatDateTime={(v) => `FMT:${v}`}
      onOpen={onOpen}
      refetchRef={refetchRef}
    />,
    { mocks: mocks ?? [tableMock(rows)] },
  );
  return { ...view, refetchRef, onOpen };
};

describe('TranslationEntriesTable', () => {
  it('builds a column per active locale plus the fixed columns, and shows the empty state', async () => {
    renderTable({ rows: [], locales: [makeLocale({ code: 'hi-IN', label: 'हिन्दी' })] });
    expect(screen.getByTestId('col-key')).toBeInTheDocument();
    expect(screen.getByTestId('col-surface')).toBeInTheDocument();
    expect(screen.getByTestId('col-page')).toBeInTheDocument();
    expect(screen.getByTestId('col-value_hi-IN')).toHaveTextContent('हिन्दी');
    expect(screen.getByTestId('col-updated_at')).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No translations match the current filters.',
    );
  });

  it('pins the surface and page as external filters rather than user-facing filter chips', async () => {
    renderTable();
    const table = await screen.findByTestId('duncit-table');
    expect(JSON.parse(table.getAttribute('data-external-filters') ?? 'null')).toEqual([
      { field: 'surface', op: 'eq', value: 'mweb' },
      { field: 'page', op: 'eq', value: 'shop' },
    ]);
  });

  it('sorts by key ascending by default', async () => {
    renderTable();
    const table = await screen.findByTestId('duncit-table');
    expect(JSON.parse(table.getAttribute('data-default-sort') ?? 'null')).toEqual({ field: 'key', dir: 'asc' });
  });

  it('fetches rows through the real translations-table query and renders them via the real columns', async () => {
    renderTable({ rows: [makeApiRow({ key: 'admin.shop.title', surface: 'mweb', page: 'shop' })] });
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByText('admin.shop.title')).toBeInTheDocument();
    expect(within(row).getByText('mweb')).toBeInTheDocument();
    expect(within(row).getByText('shop')).toBeInTheDocument();
  });

  it('identifies rows by their id and opens the clicked row', async () => {
    const onOpen = vi.fn();
    renderTable({ rows: [makeApiRow({ id: 'row-42' })], onOpen });
    const rowEl = await screen.findByTestId('table-row');
    fireEvent.click(rowEl);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-42' }));
  });

  it('advertises the key/description search placeholder', async () => {
    renderTable();
    expect(await screen.findByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search key or description',
    );
  });

  it('exposes a refetch handle that re-runs the translations query', async () => {
    const rowsFirst = [makeApiRow({ id: 'r1' })];
    const rowsSecond = [makeApiRow({ id: 'r1' }), makeApiRow({ id: 'r2', key: 'admin.shop.new' })];
    const { refetchRef } = renderTable({ mocks: [tableMock(rowsFirst), tableMock(rowsSecond)] });

    await screen.findByTestId('table-row');
    expect(screen.getAllByTestId('table-row')).toHaveLength(1);

    refetchRef.current?.();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
  });
});
