import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Chip, Grid, Link, Skeleton, Stack, Typography } from '@mui/material';
import type { IntelIndexDocument } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { PageHeader, StatCard } from '@duncit/ui';
import { ENV_LABEL_KEYS, SOURCE_LABEL_KEYS } from '../../components/sources';
import { INTEL_INDEX, type IndexData } from '../../graphql/admin';

/** Everything indexed for search: totals per source and environment, and each document with its version. */
export default function KnowledgePage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const stats = useQuery<IndexData>(INTEL_INDEX, { variables: { page: 1, page_size: 1 }, fetchPolicy: 'cache-and-network' });
  const bySource = useMemo(() => {
    const totals = new Map<string, { documents: number; chunks: number; failed: number }>();
    for (const s of stats.data?.intelIndexStats ?? []) {
      const prev = totals.get(s.source) ?? { documents: 0, chunks: 0, failed: 0 };
      totals.set(s.source, { documents: prev.documents + s.documents, chunks: prev.chunks + s.chunks, failed: prev.failed + s.failed });
    }
    return [...totals.entries()];
  }, [stats.data]);

  const fetchRows = useMemo<TableFetch<IntelIndexDocument>>(
    () => async (q) => {
      const res = await client.query<IndexData>({ query: INTEL_INDEX, variables: { search: q.search || null, page: q.page, page_size: q.pageSize }, fetchPolicy: 'network-only' });
      return { rows: res.data?.intelIndexDocuments.rows ?? [], total: res.data?.intelIndexDocuments.total ?? 0 };
    },
    [client]
  );
  const columns = useMemo<DuncitColumn<IntelIndexDocument>[]>(
    () => [
      {
        field: 'title',
        headerName: t('intel.knowledge.colTitle'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        valueGetter: (r) => r.title,
        cellRenderer: (r) =>
          r.url && !r.url.startsWith('/') ? (
            <Link href={r.url} target="_blank" rel="noopener noreferrer" noWrap>
              {r.title}
            </Link>
          ) : (
            <Typography variant="body2" noWrap>{r.title}</Typography>
          ),
      },
      { field: 'source', headerName: t('intel.knowledge.colSource'), width: 120, type: 'text', valueGetter: (r) => t(SOURCE_LABEL_KEYS[r.source] ?? 'intel.sources.MEDIA') },
      { field: 'scope', headerName: t('intel.knowledge.colScope'), width: 120, type: 'text', valueGetter: (r) => t(ENV_LABEL_KEYS[r.scope] ?? 'intel.env.SHARED') },
      { field: 'version', headerName: t('intel.knowledge.colVersion'), width: 90, type: 'number', valueGetter: (r) => r.version },
      { field: 'chunk_count', headerName: t('intel.knowledge.colChunks'), width: 100, type: 'number', valueGetter: (r) => r.chunk_count },
      {
        field: 'status',
        headerName: t('intel.knowledge.colStatus'),
        width: 120,
        type: 'text',
        valueGetter: (r) => r.status,
        cellRenderer: (r) => <Chip size="small" variant="outlined" color={r.status === 'FAILED' ? 'error' : 'success'} label={r.status === 'FAILED' ? t('intel.knowledge.failed') : t('intel.knowledge.indexed')} title={r.error || undefined} />,
      },
      dateColumn<IntelIndexDocument>({ field: 'indexed_at', headerName: t('intel.knowledge.colIndexed'), hide: false, getDate: (r) => r.indexed_at }),
    ],
    [t]
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('intel.knowledge.title')} subtitle={t('intel.knowledge.subtitle')} />
      <Grid container spacing={1.5}>
        {stats.loading && !stats.data
          ? [0, 1, 2, 3].map((i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Skeleton variant="rounded" height={92} />
              </Grid>
            ))
          : bySource.map(([source, s]) => (
              <Grid key={source} size={{ xs: 6, md: 3 }}>
                <StatCard label={t(SOURCE_LABEL_KEYS[source] ?? 'intel.sources.MEDIA')} value={s.documents} hint={t('intel.knowledge.statHint', { vars: { chunks: s.chunks, failed: s.failed } })} />
              </Grid>
            ))}
      </Grid>
      <DuncitTable<IntelIndexDocument> ariaLabel={t('intel.knowledge.title')} tableId="intel-index-documents" columns={columns} fetchRows={fetchRows} getRowId={(r) => r.id} emptyText={t('intel.knowledge.empty')} searchPlaceholder={t('intel.knowledge.search')} />
    </Stack>
  );
}
