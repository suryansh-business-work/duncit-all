import { useMemo } from 'react';
import { Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import type { AutoPodAudience, AutoPodAudienceRole } from './audience-queries';
import { useTranslation, type Translate } from '../i18n/useTranslation';

type Row = Record<string, unknown>;

interface DrawerTable {
  title: string;
  rows: readonly Row[];
  columns: DuncitColumn<Row>[];
  /** The field every row is unique on. */
  rowId: string;
  /** The text a row is searched against. */
  search: (row: Row) => string;
}

/**
 * One field of a row as searchable text.
 *
 * A Row is Record<string, unknown>, so a field that turns out to be an object
 * would stringify to '[object Object]' and quietly pollute the search index
 * with a value no one can ever match. Only scalars are text.
 */
const text = (row: Row, field: string): string => {
  const value = row[field];
  if (typeof value === 'string') return value;
  return typeof value === 'number' ? String(value) : '';
};

/** Each role's list, as the table shows it. */
function tableFor(role: AutoPodAudienceRole, audience: AutoPodAudience, t: Translate): DrawerTable {
  if (role === 'venues') {
    return {
      title: t('podForm.autoPod.drawerVenues'),
      rows: audience.venues,
      rowId: 'id',
      columns: [
        { field: 'venue_name', headerName: t('podForm.autoPod.colVenue'), flex: 1, minWidth: 180 },
        { field: 'city', headerName: t('podForm.autoPod.colCity'), width: 140 },
        { field: 'locality', headerName: t('podForm.autoPod.colLocality'), width: 150 },
        { field: 'owner_name', headerName: t('podForm.autoPod.colOwner'), width: 170 },
      ],
      search: (row) => ['venue_name', 'city', 'locality', 'owner_name'].map((f) => text(row, f)).join(' '),
    };
  }
  if (role === 'hosts') {
    return {
      title: t('podForm.autoPod.drawerHosts'),
      rows: audience.hosts,
      rowId: 'user_id',
      columns: [
        { field: 'full_name', headerName: t('podForm.autoPod.colName'), flex: 1, minWidth: 180 },
        { field: 'email', headerName: t('podForm.autoPod.colEmail'), width: 220 },
        { field: 'phone', headerName: t('podForm.autoPod.colPhone'), width: 150 },
      ],
      search: (row) => ['full_name', 'email', 'phone'].map((f) => text(row, f)).join(' '),
    };
  }
  return {
    title: t('podForm.autoPod.drawerClubAdmins'),
    rows: audience.club_admins,
    rowId: 'user_id',
    columns: [
      { field: 'full_name', headerName: t('podForm.autoPod.colName'), flex: 1, minWidth: 180 },
      { field: 'email', headerName: t('podForm.autoPod.colEmail'), width: 220 },
      {
        field: 'club_names',
        headerName: t('podForm.autoPod.colClubs'),
        width: 220,
        sortable: false,
        valueGetter: (row) => (row.club_names as string[]).join(', '),
      },
    ],
    search: (row) => [text(row, 'full_name'), text(row, 'email'), (row.club_names as string[]).join(' ')].join(' '),
  };
}

export interface AutoPodAudienceDrawerProps {
  /** Which count was pressed; null keeps the drawer closed. */
  role: AutoPodAudienceRole | null;
  audience: AutoPodAudience | null;
  onClose: () => void;
}

/**
 * The list behind a count, in a side drawer: the venues, hosts or club admins
 * the category would offer the pod to. Rows are already in hand from the
 * audience query, so the table searches and sorts them in memory.
 */
export default function AutoPodAudienceDrawer({ role, audience, onClose }: Readonly<AutoPodAudienceDrawerProps>) {
  const { t } = useTranslation();
  const table = useMemo(() => (role && audience ? tableFor(role, audience, t) : null), [role, audience, t]);
  const fetchRows = useMemo(() => (table ? clientTableFetch(table.rows, table.search) : null), [table]);

  return (
    <Drawer
      anchor="right"
      open={!!table}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 640 } } } }}
    >
      {table && fetchRows && (
        <Stack spacing={2} sx={{ p: 2 }} data-testid="auto-pod-audience-drawer">
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {table.title}
            </Typography>
            <IconButton onClick={onClose} aria-label={t('podForm.autoPod.drawerClose')}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <DuncitTable<Row>
            tableId={`auto-pod-audience-${role}`}
            columns={table.columns}
            fetchRows={fetchRows}
            getRowId={(row) => text(row, table.rowId)}
            emptyText={t('podForm.autoPod.drawerEmpty')}
            searchPlaceholder={t('podForm.autoPod.drawerSearch')}
          />
        </Stack>
      )}
    </Drawer>
  );
}
