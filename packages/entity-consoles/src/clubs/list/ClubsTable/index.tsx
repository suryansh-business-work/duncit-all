import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import EventIcon from '@mui/icons-material/Event';
import { DuncitIconButton } from '@duncit/buttons';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
  type TableFilterValue,
} from '@duncit/table';
import type { ClubRow } from '../queries';
import { clubTabPath } from '../../records/clubTabPath';
import { useTranslation } from '@duncit/shell';
import { ClubNameCell, hasNoClubAdmin, renderCover, renderWhatsApp, whatsAppValue } from './cells';

export { hasNoClubAdmin } from './cells';

interface Props {
  fetchRows: TableFetch<ClubRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  catName: (id: string) => string;
  /** Toolbar's Super Category filter; '' means every super category. */
  superCategoryId: string;
  toolbarActions?: ReactNode;
  onEdit: (c: ClubRow) => void;
  onRemove: (c: ClubRow) => void;
  onView: (c: ClubRow) => void;
}

const getClubRowId = (c: ClubRow) => c.id;

export default function ClubsTable({
  fetchRows,
  refetchRef,
  catName,
  superCategoryId,
  toolbarActions,
  onEdit,
  onRemove,
  onView,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ClubRow>[]>(() => {
    const renderCategory = (c: ClubRow) =>
      c.category_id ? <Chip size="small" label={catName(c.category_id)} /> : '—';
    const renderViewPods = (c: ClubRow) => (
      <Tooltip title={t('admin.clubs.viewPods')}>
        <DuncitIconButton size="small" component={RouterLink} to={clubTabPath(c.id, 'pods')}>
          <EventIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    );
    return [
      { field: 'cover', headerName: t('admin.clubs.colCover'), type: 'text', width: 80, cellRenderer: renderCover },
      {
        field: 'club_name',
        headerName: t('admin.clubs.colClub'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: (c) => <ClubNameCell club={c} t={t} />,
        // Keyed on the flag too, so the cell repaints the moment an admin is
        // assigned — a renderer whose value never changes freezes (S…/AG Grid).
        valueGetter: (c) => `${c.club_name}${hasNoClubAdmin(c) ? ' · no club admin' : ''}`,
      },
      {
        field: 'category_id',
        headerName: t('admin.clubs.colCategory'),
        type: 'text',
        // The stored value is an ObjectId: a text match cannot be cast to one. The super-category select filters it.
        filterable: false,
        minWidth: 140,
        cellRenderer: renderCategory,
        valueGetter: (c) => (c.category_id ? catName(c.category_id) : '—'),
      },
      {
        field: 'matched_venues_count',
        headerName: t('admin.clubs.venues'),
        type: 'number',
        // Counted per row by matching venues at read time — not a field stored on the club.
        sortable: false,
        filterable: false,
        width: 96,
        valueGetter: (c) => c.matched_venues_count ?? 0,
      },
      {
        field: 'whatsapp',
        headerName: 'WhatsApp',
        type: 'text',
        // Two link fields folded into C / G markers — no single stored value to order or match on.
        sortable: false,
        filterable: false,
        width: 110,
        cellRenderer: renderWhatsApp,
        valueGetter: whatsAppValue,
      },
      { field: 'locality', headerName: t('admin.clubs.colLocality'), type: 'text', hide: true, minWidth: 140 },
      activeChipColumn<ClubRow>({ inactiveLabel: 'Draft' }),
      {
        field: 'is_verified',
        headerName: t('admin.clubs.verified'),
        type: 'boolean',
        hide: true,
        width: 110,
        valueGetter: (c) => (c.is_verified ? 'Yes' : 'No'),
      },
      dateColumn<ClubRow>(),
      actionsColumn<ClubRow>({
        width: 140,
        onEdit,
        onDelete: onRemove,
        delete: { color: 'default' },
        renderExtra: renderViewPods,
      }),
    ];
  }, [catName, onEdit, onRemove]);

  // Pinned page filter rather than a column one: it belongs to the toolbar, so
  // it never shows as a removable chip and a change resets to page 1.
  const externalFilters = useMemo<TableFilterValue[]>(
    () =>
      superCategoryId ? [{ field: 'super_category_id', op: 'eq', value: superCategoryId }] : [],
    [superCategoryId],
  );

  return (
    <DuncitTable<ClubRow>
      ariaLabel={t('admin.clubs.title')}
      tableId="admin-clubs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getClubRowId}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText={'No clubs yet. Click "New Club" to create the first one.'}
      defaultSort={{ field: 'club_name', dir: 'asc' }}
      searchPlaceholder="Search name, ID or locality"
      externalFilters={externalFilters}
      refetchRef={refetchRef}
    />
  );
}
