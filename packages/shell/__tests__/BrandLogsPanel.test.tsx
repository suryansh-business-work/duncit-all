/**
 * The brand's activity log. What matters: it asks the server for THIS brand's
 * BRAND trail (the server owns who may read it), hands the shared table the
 * established change-log columns, and every cell reads a stored value the way
 * the directory consoles do — em-dash for an empty side, localized enum labels,
 * the raw value for an enum the server added later.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { DuncitColumn, TableQueryState } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import type { BrandChangeLogRow } from '../src/brand/logs/queries';

interface CapturedTable {
  ariaLabel: string;
  tableId: string;
  columns: DuncitColumn<BrandChangeLogRow>[];
  fetchRows: (q: TableQueryState) => Promise<{ rows: BrandChangeLogRow[]; total: number }>;
  getRowId: (row: BrandChangeLogRow) => string;
  emptyText: string;
  defaultSort: { field: string; dir: string };
  searchPlaceholder: string;
}

const { client, seen } = vi.hoisted(() => ({
  client: { query: vi.fn() },
  seen: { table: null as unknown },
}));

vi.mock('@apollo/client/react', () => ({ useApolloClient: () => client }));
vi.mock('@duncit/table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/table')>()),
  DuncitTable: (props: unknown) => {
    seen.table = props;
    return <div data-testid="duncit-table" />;
  },
}));

const { BrandLogsPanel } = await import('../src/brand/logs/BrandLogsPanel');
const { BRAND_CHANGE_LOGS_TABLE } = await import('../src/brand/logs/queries');

const QUERY: TableQueryState = { search: 'logo', page: 1, pageSize: 25, sortBy: null, sortDir: 'desc', filters: [] };

const row = (over: Partial<BrandChangeLogRow> = {}): BrandChangeLogRow => ({
  id: 'log-1',
  entity_type: 'BRAND',
  entity_id: 'brand-42',
  entity_label: 'Paws & Co',
  field: 'display_name',
  field_label: 'Brand name',
  old_value: 'Paws',
  new_value: 'Paws & Co',
  action: 'UPDATE',
  actor_type: 'OWNER',
  actor_user_id: 'user-7',
  actor_name: 'Asha Rao',
  source: 'PORTAL',
  created_at: '2026-10-01T09:30:00.000Z',
  ...over,
});

const table = () => seen.table as CapturedTable;
const column = (field: string) => {
  const found = table().columns.find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const optionLabels = (field: string) => {
  const found = column(field);
  return found.type === 'enum' ? found.options.map((o) => o.label) : [];
};
const cell = (field: string, r: BrandChangeLogRow) => {
  const renderer = column(field).cellRenderer as (r: BrandChangeLogRow) => ReactNode;
  return render(<div data-testid="cell">{renderer(r)}</div>);
};

beforeEach(() => {
  seen.table = null;
  client.query.mockReset();
});

describe('BrandLogsPanel', () => {
  it('titles the log and configures the shared table newest-first', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="partners-brand-logs" />);

    expect(screen.getByRole('heading', { name: 'Activity log' })).toBeInTheDocument();
    expect(screen.getByText(/Every change made to this brand/)).toBeInTheDocument();
    expect(table()).toMatchObject({
      ariaLabel: 'Activity log',
      tableId: 'partners-brand-logs',
      emptyText: 'No changes recorded for this brand yet.',
      defaultSort: { field: 'created_at', dir: 'desc' },
      searchPlaceholder: 'Search field, old or new value, or who changed it',
    });
    expect(table().getRowId(row({ id: 'log-9' }))).toBe('log-9');
    expect(table().columns.map((c) => c.headerName)).toEqual([
      'When',
      'Field',
      'Old value',
      'New value',
      'Action',
      'Changed by',
      'Changed by (name / ID)',
      'Source',
    ]);
  });

  it("asks the server for this brand's BRAND trail and returns its page", async () => {
    const rows = [row()];
    client.query.mockResolvedValue({ data: { entityChangeLogsTable: { rows, total: 1 } } });
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);

    await expect(table().fetchRows(QUERY)).resolves.toEqual({ rows, total: 1 });
    expect(client.query).toHaveBeenCalledWith({
      query: BRAND_CHANGE_LOGS_TABLE,
      variables: expect.objectContaining({ entity_type: 'BRAND', entity_id: 'brand-42' }),
      fetchPolicy: 'network-only',
    });
  });

  it('offers the localized enum labels as the filter options', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    expect(optionLabels('action')).toEqual(['Created', 'Updated', 'Deleted']);
    expect(optionLabels('actor_type')).toEqual(['Owner', 'Admin', 'System']);
    expect(optionLabels('source')).toEqual([
      'App',
      'mWeb',
      'Admin Portal',
      'Portal',
      'System',
    ]);
  });

  it('reads plain values through the configured date format and the column getters', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    const r = row();
    expect(column('created_at').valueGetter?.(r)).toBe(formatDateTime(r.created_at));
    expect(column('field_label').valueGetter?.(r)).toBe('Brand name');
    expect(column('old_value').valueGetter?.(r)).toBe('Paws');
    expect(column('new_value').valueGetter?.(r)).toBe('Paws & Co');
    expect(column('action').valueGetter?.(r)).toBe('UPDATE');
    expect(column('actor_type').valueGetter?.(r)).toBe('OWNER');
    expect(column('source').valueGetter?.(r)).toBe('PORTAL');
    expect(column('actor_name').valueGetter?.(r)).toBe('Asha Rao — user-7');
    expect(column('actor_name').valueGetter?.(row({ actor_user_id: null }))).toBe('Asha Rao');
  });

  it('shows the field label over its document path', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    cell('field_label', row());
    expect(screen.getByText('Brand name')).toBeInTheDocument();
    expect(screen.getByText('display_name')).toBeInTheDocument();
  });

  it('falls back to the field path when the label is empty', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    cell('field_label', row({ field_label: '' }));
    expect(screen.getAllByText('display_name')).toHaveLength(2);
  });

  it('shows both sides of a change, and an em-dash for the side that was empty', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    cell('old_value', row({ old_value: '' }));
    cell('new_value', row({ new_value: 'Paws & Co' }));
    const cells = screen.getAllByTestId('cell');
    expect(cells[0]).toHaveTextContent('—');
    expect(cells[1]).toHaveTextContent('Paws & Co');
  });

  it('labels the action, the actor kind and the surface in readable words', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    const r = row({ action: 'DELETE', actor_type: 'ADMIN', source: 'ADMIN_PORTAL' });
    cell('action', r);
    cell('actor_type', r);
    cell('source', r);
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  it('shows the raw value for an enum the server added after this build', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    cell('source', row({ source: 'KIOSK' as BrandChangeLogRow['source'] }));
    expect(screen.getByText('KIOSK')).toBeInTheDocument();
  });

  it('names who made the change over their account id, with em-dashes when unknown', () => {
    render(<BrandLogsPanel brandId="brand-42" tableId="t" />);
    cell('actor_name', row());
    cell('actor_name', row({ actor_name: '', actor_user_id: null }));
    const cells = screen.getAllByTestId('cell');
    expect(cells[0]).toHaveTextContent('Asha Rao');
    expect(cells[0]).toHaveTextContent('user-7');
    expect(cells[1].textContent).toBe('——');
  });
});
