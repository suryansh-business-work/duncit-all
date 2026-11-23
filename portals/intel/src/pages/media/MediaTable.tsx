import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatBytes } from '@duncit/utils';
import { INTEL_MEDIA, type IntelMedia, type MediaData } from '../../graphql/media';
import { INDEX_COLOR, INDEX_KEYS, VISIBILITY_KEYS } from './labels';

interface Props {
  view: string;
  folder: string;
  onOpen: (file: IntelMedia) => void;
  refetchRef: MutableRefObject<(() => void) | null>;
}

/** The files in the current view and folder — paged and searched on the server. */
export default function MediaTable({ view, folder, onOpen, refetchRef }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useMemo<TableFetch<IntelMedia>>(
    () => async (q) => {
      const res = await client.query<MediaData>({ query: INTEL_MEDIA, variables: { view, folder: view === 'ALL' ? folder : null, search: q.search || null, page: q.page, page_size: q.pageSize }, fetchPolicy: 'network-only' });
      return { rows: res.data?.intelMedia.rows ?? [], total: res.data?.intelMedia.total ?? 0 };
    },
    [client, view, folder]
  );
  const columns = useMemo<DuncitColumn<IntelMedia>[]>(
    () => [
      {
        field: 'name',
        headerName: t('intel.media.colName'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        valueGetter: (r) => r.name,
        cellRenderer: (r) => (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {r.favorite && <StarIcon fontSize="inherit" color="warning" aria-label={t('intel.media.favorite')} />}
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {r.name}
            </Typography>
          </Stack>
        ),
      },
      { field: 'folder', headerName: t('intel.media.colFolder'), width: 140, type: 'text', valueGetter: (r) => r.folder },
      { field: 'size', headerName: t('intel.media.colSize'), width: 110, type: 'number', valueGetter: (r) => r.size, cellRenderer: (r) => formatBytes(r.size) },
      { field: 'visibility', headerName: t('intel.media.colVisibility'), width: 120, type: 'text', valueGetter: (r) => t(VISIBILITY_KEYS[r.visibility] ?? 'intel.media.visibility.PRIVATE') },
      {
        field: 'index_status',
        headerName: t('intel.media.colIndex'),
        width: 140,
        type: 'text',
        valueGetter: (r) => r.index_status,
        cellRenderer: (r) => <Chip size="small" variant="outlined" color={INDEX_COLOR[r.index_status] ?? 'default'} label={t(INDEX_KEYS[r.index_status] ?? 'intel.media.index.PENDING')} />,
      },
      dateColumn<IntelMedia>({ field: 'updated_at', headerName: t('intel.media.colUpdated'), hide: false, getDate: (r) => r.updated_at }),
    ],
    [t]
  );
  return (
    <DuncitTable<IntelMedia>
      ariaLabel={t('intel.media.title')}
      tableId={`intel-media-${view.toLowerCase()}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      emptyText={t('intel.media.empty')}
      searchPlaceholder={t('intel.media.search')}
      refetchRef={refetchRef}
    />
  );
}
