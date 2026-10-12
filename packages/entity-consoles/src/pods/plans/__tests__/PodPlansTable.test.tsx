import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import PodPlansTable, { type PlanRow } from '../PodPlansTable';

const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  return {
    ...actual,
    DuncitTable: (props: Record<string, unknown>) => {
      captured.props = props;
      return <div data-testid="toolbar">{props.toolbarActions as React.ReactNode}</div>;
    },
  };
});

const makePlan = (over: Partial<PlanRow> = {}): PlanRow => ({
  id: 'plan-1',
  key: 'premium',
  name: 'Premium',
  description: 'Everything in Free, plus priority booking.',
  image_url: '',
  features: ['Priority booking', 'Early access'],
  price_label: '₹199 / month',
  sort_order: 2,
  is_coming_soon: false,
  is_active: true,
  ...over,
});

const mount = (over: Partial<Parameters<typeof PodPlansTable>[0]> = {}) => {
  const props = {
    fetchRows: vi.fn(),
    refetchRef: { current: null },
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(<PodPlansTable {...props} />);
  const columns = captured.props?.columns as DuncitColumn<PlanRow>[];
  const column = (field: string) => {
    const found = columns.find((c) => c.field === field);
    if (!found) throw new Error(`no ${field} column`);
    return found;
  };
  return { props, columns, column };
};

describe('PodPlansTable', () => {
  it('wires the table id, fetcher, row id, default order and search hint', () => {
    const fetchRows = vi.fn();
    const refetchRef = { current: null };
    mount({ fetchRows, refetchRef });

    expect(captured.props).toMatchObject({
      tableId: 'admin-pod-plans',
      fetchRows,
      refetchRef,
      defaultSort: { field: 'sort_order', dir: 'asc' },
      searchPlaceholder: 'Search name or key',
      emptyText: 'No plans yet. Click "New plan" to create one.',
    });
    const getRowId = captured.props?.getRowId as (row: PlanRow) => string;
    expect(getRowId(makePlan({ id: 'row-9' }))).toBe('row-9');
  });

  it('renders the passed toolbar actions', () => {
    mount({ toolbarActions: <button type="button">New plan</button> });
    expect(screen.getByTestId('toolbar')).toHaveTextContent('New plan');
  });

  it('declares the columns in reading order, hiding the coming-soon flag and sort order', () => {
    const { columns } = mount();
    expect(columns.map((c) => c.field)).toEqual([
      'name',
      'key',
      'price_label',
      'features',
      'is_active',
      'is_coming_soon',
      'sort_order',
      'actions',
    ]);
    expect(columns.filter((c) => c.hide).map((c) => c.field)).toEqual(['is_coming_soon', 'sort_order']);
  });

  it('shows the plan name with its image and a clipped description', () => {
    const { column } = mount();
    const name = column('name');
    const long = 'x'.repeat(75);
    const { container } = render(
      <>{name.cellRenderer?.(makePlan({ image_url: 'https://cdn.test/p.png', description: long }))}</>,
    );

    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/p.png');
    expect(screen.getByText(`${'x'.repeat(60)}…`)).toBeInTheDocument();
    expect(name.valueGetter?.(makePlan())).toBe('Premium');
  });

  it('leaves a short description whole, and no image or description when there are none', () => {
    const { column } = mount();
    const name = column('name');
    const short = render(<>{name.cellRenderer?.(makePlan({ description: 'Short blurb' }))}</>);
    expect(short.getByText('Short blurb')).toBeInTheDocument();
    short.unmount();

    const bare = render(<>{name.cellRenderer?.(makePlan({ description: '', image_url: '' }))}</>);
    expect(bare.container.querySelector('img')).not.toBeInTheDocument();
    expect(bare.queryByText('Short blurb')).not.toBeInTheDocument();
  });

  it('shows the key in code, a dash for a missing price label and the feature count', () => {
    const { column } = mount();
    const { container } = render(<>{column('key').cellRenderer?.(makePlan())}</>);
    expect(container.querySelector('code')).toHaveTextContent('premium');
    expect(column('key').valueGetter?.(makePlan())).toBe('premium');

    expect(column('price_label').valueGetter?.(makePlan())).toBe('₹199 / month');
    expect(column('price_label').valueGetter?.(makePlan({ price_label: '' }))).toBe('—');

    expect(column('features').valueGetter?.(makePlan())).toBe(2);
    expect(column('features').valueGetter?.(makePlan({ features: [] }))).toBe(0);
  });

  it('shows Active, Inactive and the coming-soon marker as status', () => {
    const { column } = mount();
    const status = column('is_active');

    const active = render(<>{status.cellRenderer?.(makePlan())}</>);
    expect(active.getByText('Active')).toBeInTheDocument();
    expect(active.queryByText('Coming soon')).not.toBeInTheDocument();
    active.unmount();

    render(<>{status.cellRenderer?.(makePlan({ is_active: false, is_coming_soon: true }))}</>);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();

    expect(status.valueGetter?.(makePlan())).toBe('Active');
    expect(status.valueGetter?.(makePlan({ is_active: false }))).toBe('Inactive');
    expect(column('is_coming_soon').valueGetter?.(makePlan({ is_coming_soon: true }))).toBe('Yes');
    expect(column('is_coming_soon').valueGetter?.(makePlan())).toBe('No');
  });

  it('hands the real row to the edit and delete actions', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { column } = mount({ onEdit, onDelete });
    const row = makePlan({ id: 'row-7' });
    render(<>{column('actions').cellRenderer?.(row)}</>);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledWith(row);
    expect(onDelete).toHaveBeenCalledWith(row);
  });
});
