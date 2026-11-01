import { useMemo } from 'react';
import { Link } from '@mui/material';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { PLATFORM_LABEL } from '../social-accounts-page/copy';
import { labelOf, useFigures } from '../analytics-shared/format';
import type { AnalyticsTopPost } from '../analytics-shared/queries';

const getRowId = (row: AnalyticsTopPost) => row.id;
const searchOf = (row: AnalyticsTopPost) => `${row.text} ${row.account_name}`;

/** The window's best posts, with a link out to each on its network. */
export default function TopPostsTable({ rows }: Readonly<{ rows: readonly AnalyticsTopPost[] }>) {
  const { t } = useTranslation();
  const { count } = useFigures();
  const columns = useMemo<DuncitColumn<AnalyticsTopPost>[]>(
    () => [
      {
        field: 'text',
        headerName: t('marketing.analytics.colPost'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        valueGetter: (row) => row.text,
        cellRenderer: (row) =>
          row.permalink ? (
            <Link href={row.permalink} target="_blank" rel="noopener noreferrer">
              {row.text || t('marketing.analytics.untitledPost')}
            </Link>
          ) : (
            row.text || t('marketing.analytics.untitledPost')
          ),
      },
      { field: 'platform', headerName: t('marketing.analytics.colNetwork'), width: 130, type: 'text', valueGetter: (row) => labelOf(PLATFORM_LABEL, row.platform, t) },
      { field: 'account_name', headerName: t('marketing.analytics.colAccount'), width: 160, type: 'text', valueGetter: (row) => row.account_name },
      dateColumn<AnalyticsTopPost>({ field: 'published_at', headerName: t('marketing.analytics.colPublished'), hide: false }),
      { field: 'views', headerName: t('marketing.analytics.kpi.views'), width: 110, type: 'number', valueGetter: (row) => count(row.views) },
      { field: 'engagement', headerName: t('marketing.analytics.kpi.engagement'), width: 130, type: 'number', valueGetter: (row) => count(row.engagement) },
    ],
    [t, count],
  );
  const fetchRows = useMemo(() => clientTableFetch<AnalyticsTopPost>(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<AnalyticsTopPost>
      tableId="marketing-analytics-top-posts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('marketing.analytics.noPosts')}
      defaultSort={{ field: 'engagement', dir: 'desc' }}
    />
  );
}
