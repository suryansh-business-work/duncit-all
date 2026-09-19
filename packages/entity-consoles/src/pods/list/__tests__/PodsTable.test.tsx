import type { CSSProperties, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PodsTable from '../PodsTable';
import type { PodRow } from '../queries';

const flags = vi.hoisted(() => ({ products: false }));

vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFeatureFlag: (key: string) => key === 'is_product_visible' && flags.products,
  };
});

interface StubTableProps {
  tableId: string;
  columns: { field: string; headerName: string }[];
  fetchRows: (q: unknown) => Promise<{ rows: PodRow[]; total: number }>;
  getRowId: (row: PodRow) => string;
  onRowClick: (row: PodRow) => void;
  getRowStyle: (row: PodRow) => CSSProperties | undefined;
  toolbarActions?: ReactNode;
  emptyText: string;
  defaultSort: { field: string; dir: string };
  searchPlaceholder: string;
  refetchRef: { current: (() => void) | null };
}

/** Stands in for AG Grid (no layout engine under jsdom) while honouring the
 * contract PodsTable relies on: rows come from `fetchRows`, each row is keyed by
 * `getRowId`, painted with `getRowStyle` and clickable through `onRowClick`. */
vi.mock('@duncit/table', async () => {
  const { useEffect, useState } = await import('react');
  return {
    DuncitTable: (props: StubTableProps) => {
      const [rows, setRows] = useState<PodRow[]>([]);
      useEffect(() => {
        const load = () => {
          props.fetchRows({ sortBy: props.defaultSort.field, sortDir: props.defaultSort.dir }).then((res) => setRows(res.rows));
        };
        props.refetchRef.current = load;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <div data-testid={props.tableId} data-search-placeholder={props.searchPlaceholder}>
          <div data-testid="toolbar">{props.toolbarActions}</div>
          <div data-testid="headers">{props.columns.map((c) => c.headerName).join('|')}</div>
          {rows.length === 0 && <div>{props.emptyText}</div>}
          {rows.map((row) => (
            <button
              type="button"
              key={props.getRowId(row)}
              data-testid={`row-${props.getRowId(row)}`}
              style={props.getRowStyle(row)}
              onClick={() => props.onRowClick(row)}
            >
              {row.pod_title}
            </button>
          ))}
        </div>
      );
    },
  };
});

const makePod = (over: Partial<PodRow> = {}): PodRow => ({
  id: 'doc1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  club_id: 'club1',
  pod_mode: 'PHYSICAL',
  pod_hits: 12,
  pod_type: 'NATIVE_PAID',
  pod_amount: 499,
  is_active: true,
  ...over,
});

const makeProps = (rows: PodRow[]) => ({
  fetchRows: vi.fn(async () => ({ rows, total: rows.length })),
  refetchRef: { current: null as (() => void) | null },
  clubName: (id: string) => `Club<${id}>`,
  venueName: (id: string) => `Venue<${id}>`,
  locName: (id: string) => `Loc<${id}>`,
  minPax: () => 0,
  onEdit: vi.fn(),
  onQuickEdit: vi.fn(),
  onDelete: vi.fn(),
  onComplete: vi.fn(),
  onMonitor: vi.fn(),
  onView: vi.fn(),
});

beforeEach(() => {
  flags.products = false;
});

describe('PodsTable', () => {
  it('lists the fetched pods newest first under the admin-pods table id', async () => {
    const props = makeProps([makePod()]);
    render(<PodsTable {...props} toolbarActions={<span>New Pod</span>} />);

    expect(await screen.findByTestId('row-doc1')).toHaveTextContent('Sunday Badminton');
    expect(props.fetchRows).toHaveBeenCalledWith({ sortBy: 'pod_date_time', sortDir: 'desc' });
    expect(screen.getByTestId('admin-pods')).toHaveAttribute('data-search-placeholder', 'Search title or pod ID');
    expect(screen.getByTestId('toolbar')).toHaveTextContent('New Pod');
    expect(props.refetchRef.current).toBeTypeOf('function');
  });

  it('shows the empty copy when there are no pods', async () => {
    render(<PodsTable {...makeProps([])} />);
    expect(await screen.findByText('No pods yet.')).toBeInTheDocument();
  });

  it('opens the pod when its row is clicked', async () => {
    const pod = makePod();
    const props = makeProps([pod]);
    render(<PodsTable {...props} />);
    fireEvent.click(await screen.findByTestId('row-doc1'));
    expect(props.onView).toHaveBeenCalledWith(pod);
  });

  it('tints a pod the auto-cancel sweep would cancel, and only that pod', async () => {
    const atRisk = makePod({ id: 'risk', cancellation_risk: { at_risk: true, shortfall: 3 } });
    const safe = makePod({ id: 'safe', cancellation_risk: { at_risk: false, shortfall: 0 } });
    const noVerdict = makePod({ id: 'none', cancellation_risk: null });
    const cancelled = makePod({ id: 'gone', is_deleted: true, cancellation_risk: { at_risk: true, shortfall: 3 } });
    render(<PodsTable {...makeProps([atRisk, safe, noVerdict, cancelled])} />);

    expect((await screen.findByTestId('row-risk')).style.backgroundColor).not.toBe('');
    expect(screen.getByTestId('row-safe').style.backgroundColor).toBe('');
    expect(screen.getByTestId('row-none').style.backgroundColor).toBe('');
    expect(screen.getByTestId('row-gone').style.backgroundColor).toBe('');
  });

  it('leaves the products column out while the products flag is off', async () => {
    render(<PodsTable {...makeProps([])} />);
    await screen.findByText('No pods yet.');
    expect(screen.getByTestId('headers')).not.toHaveTextContent('Products');
    expect(screen.getByTestId('headers')).toHaveTextContent('Spots');
  });

  it('adds the products column when the products flag is on', async () => {
    flags.products = true;
    render(<PodsTable {...makeProps([])} />);
    await waitFor(() => expect(screen.getByTestId('headers')).toHaveTextContent('Products'));
  });
});
