import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import ClubsTable from '../ClubsTable';
import type { ClubRow } from '../queries';

const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  return {
    ...actual,
    DuncitTable: (props: Record<string, unknown>) => {
      captured.props = props;
      const columns = props.columns as DuncitColumn<ClubRow>[];
      return (
        <div data-testid="duncit-table">
          <div data-testid="toolbar">{props.toolbarActions as React.ReactNode}</div>
          <div data-testid="headers">{columns.map((c) => c.headerName).join('|')}</div>
        </div>
      );
    },
  };
});

const makeRow = (over: Partial<ClubRow> = {}): ClubRow => ({
  id: 'c1',
  club_id: 'CLB-1',
  club_name: 'Chess Club',
  locality: 'Indiranagar',
  category_id: 'cat-1',
  is_verified: true,
  is_active: true,
  created_at: '2026-02-01T00:00:00.000Z',
  ...over,
});

const catName = (id: string) => (id === 'cat-1' ? 'Board Games' : '—');

const baseProps = {
  fetchRows: vi.fn(),
  refetchRef: { current: null },
  catName,
  superCategoryId: '',
};

describe('ClubsTable', () => {
  it('wires tableId, getRowId, defaultSort, refetchRef and the search placeholder into DuncitTable', () => {
    const refetchRef = { current: null };
    const fetchRows = vi.fn();
    render(
      <ClubsTable
        {...baseProps}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onView={vi.fn()}
      />,
    );
    expect(captured.props).toMatchObject({
      tableId: 'admin-clubs',
      fetchRows,
      refetchRef,
      defaultSort: { field: 'club_name', dir: 'asc' },
      searchPlaceholder: 'Search name, ID or locality',
      emptyText: 'No clubs yet. Click "New Club" to create the first one.',
    });
    const getRowId = captured.props?.getRowId as (row: ClubRow) => string;
    expect(getRowId(makeRow({ id: 'row-9' }))).toBe('row-9');
  });

  it('passes onView as the row click handler', () => {
    const onView = vi.fn();
    render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={onView} />);
    const onRowClick = captured.props?.onRowClick as (row: ClubRow) => void;
    const row = makeRow();
    onRowClick(row);
    expect(onView).toHaveBeenCalledWith(row);
  });

  it('sets no external filter when superCategoryId is empty', () => {
    render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
    expect(captured.props?.externalFilters).toEqual([]);
  });

  it('pins a super_category_id external filter when superCategoryId is set', () => {
    render(
      <ClubsTable {...baseProps} superCategoryId="super-1" onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />,
    );
    expect(captured.props?.externalFilters).toEqual([{ field: 'super_category_id', op: 'eq', value: 'super-1' }]);
  });

  it('renders the passed-in toolbar actions', () => {
    render(
      <ClubsTable
        {...baseProps}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onView={vi.fn()}
        toolbarActions={<button type="button">New Club</button>}
      />,
    );
    expect(screen.getByTestId('toolbar')).toHaveTextContent('New Club');
  });

  it('builds the full club column set with translated headers', () => {
    render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByTestId('headers')).toHaveTextContent(
      [
        'Cover',
        'Club',
        'Category',
        'Venues',
        'WhatsApp',
        'Locality',
        '', // activeChipColumn has no explicit headerName (resolved via headerKey)
        'Verified',
        '', // dateColumn has no explicit headerName either
        '', // actionsColumn likewise
      ].join('|'),
    );
  });

  describe('cover column', () => {
    const columnsFrom = () => captured.props?.columns as DuncitColumn<ClubRow>[];

    it("renders the club's first feature image and falls back to the club's initial", () => {
      render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
      const coverCol = columnsFrom().find((c) => c.field === 'cover');
      if (!coverCol?.cellRenderer) throw new Error('cover column missing a cellRenderer');

      const withImage = makeRow({ club_feature_images_and_videos: [{ url: 'https://cdn.test/a.jpg', type: 'IMAGE' }] });
      const { container: withImgContainer } = render(<>{coverCol.cellRenderer(withImage)}</>);
      expect(withImgContainer.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/a.jpg');

      const withoutImage = makeRow({ club_feature_images_and_videos: [] });
      render(<>{coverCol.cellRenderer(withoutImage)}</>);
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  describe('club column', () => {
    it('renders the club name and id, and the valueGetter matches the name', () => {
      render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
      const columns = captured.props?.columns as DuncitColumn<ClubRow>[];
      const clubCol = columns.find((c) => c.field === 'club_name');
      if (!clubCol?.cellRenderer || !clubCol.valueGetter) throw new Error('club column missing renderer/getter');
      const row = makeRow();
      render(<>{clubCol.cellRenderer(row)}</>);
      expect(screen.getByText('Chess Club')).toBeInTheDocument();
      expect(screen.getByText('CLB-1')).toBeInTheDocument();
      expect(clubCol.valueGetter(row)).toBe('Chess Club');
    });
  });

  describe('category column', () => {
    it('renders a chip with the resolved category name when set, and a dash when unset', () => {
      render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
      const columns = captured.props?.columns as DuncitColumn<ClubRow>[];
      const catCol = columns.find((c) => c.field === 'category_id');
      if (!catCol?.cellRenderer || !catCol.valueGetter) throw new Error('category column missing renderer/getter');

      const withCat = makeRow({ category_id: 'cat-1' });
      render(<>{catCol.cellRenderer(withCat)}</>);
      expect(screen.getByText('Board Games')).toBeInTheDocument();
      expect(catCol.valueGetter(withCat)).toBe('Board Games');

      const withoutCat = makeRow({ category_id: null });
      const { container } = render(<>{catCol.cellRenderer(withoutCat)}</>);
      expect(container).toHaveTextContent('—');
      expect(catCol.valueGetter(withoutCat)).toBe('—');
    });
  });

  describe('matched_venues_count column', () => {
    it('reads the count, defaulting a missing value to 0', () => {
      render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
      const columns = captured.props?.columns as DuncitColumn<ClubRow>[];
      const col = columns.find((c) => c.field === 'matched_venues_count');
      if (!col?.valueGetter) throw new Error('venues column missing a valueGetter');
      expect(col.valueGetter(makeRow({ matched_venues_count: 7 }))).toBe(7);
      expect(col.valueGetter(makeRow({ matched_venues_count: null }))).toBe(0);
    });
  });

  describe('whatsapp column', () => {
    it('shows a C chip for the community link and a G chip for the group link, independently', () => {
      render(<ClubsTable {...baseProps} onEdit={vi.fn()} onRemove={vi.fn()} onView={vi.fn()} />);
      const columns = captured.props?.columns as DuncitColumn<ClubRow>[];
      const col = columns.find((c) => c.field === 'whatsapp');
      if (!col?.cellRenderer || !col.valueGetter) throw new Error('whatsapp column missing renderer/getter');

      const both = makeRow({ club_whats_app_community_link: 'https://x', club_whats_app_group_link: 'https://y' });
      const { container: bothContainer } = render(<>{col.cellRenderer(both)}</>);
      expect(bothContainer).toHaveTextContent('C');
      expect(bothContainer).toHaveTextContent('G');
      expect(col.valueGetter(both)).toBe('C G');

      const communityOnly = makeRow({ club_whats_app_community_link: 'https://x', club_whats_app_group_link: null });
      expect(col.valueGetter(communityOnly)).toBe('C');

      const neither = makeRow({ club_whats_app_community_link: null, club_whats_app_group_link: null });
      const { container: neitherContainer } = render(<>{col.cellRenderer(neither)}</>);
      expect(neitherContainer).toHaveTextContent('');
      expect(col.valueGetter(neither)).toBe('');
    });
  });

  describe('actions column', () => {
    it('wires the View Pods link plus edit/delete callbacks to the real row', () => {
      const onEdit = vi.fn();
      const onRemove = vi.fn();
      render(<ClubsTable {...baseProps} onEdit={onEdit} onRemove={onRemove} onView={vi.fn()} />);
      const columns = captured.props?.columns as DuncitColumn<ClubRow>[];
      const actionsCol = columns.find((c) => c.field === 'actions');
      if (!actionsCol?.cellRenderer) throw new Error('actions column missing a cellRenderer');

      const row = makeRow({ id: 'row-7' });
      const { container } = render(<>{actionsCol.cellRenderer(row)}</>);
      expect(container.querySelector('a[href="/pods?club_id=row-7"]')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(onEdit).toHaveBeenCalledWith(row);
      expect(onRemove).toHaveBeenCalledWith(row);
    });
  });
});
