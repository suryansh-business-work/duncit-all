import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import { clientTableFetch, DuncitTable } from '@duncit/table';
import { makeReleaseColumns } from './releaseColumns';
import { humanState, type ReleaseStore, type StoreReleaseRow } from './queries';

interface Props {
  store: ReleaseStore;
  rows: StoreReleaseRow[];
  onRowClick: (row: StoreReleaseRow) => void;
  /** The tab heading — names the grid for screen readers. */
  ariaLabel: string;
}

const getRowId = (row: StoreReleaseRow) => row.id;

/** What the search box matches on: version, build, the store's word and whatever the issue says. */
const searchOf = (row: StoreReleaseRow) =>
  [
    row.version,
    row.build_number,
    humanState(row.state),
    row.review_state,
    row.track,
    row.build_no,
    row.issue?.reviewer_message ?? '',
    row.issue?.advice?.summary ?? '',
  ].join(' ');

/** One store's releases, already in hand — searched, filtered, sorted and paged in the browser. */
export default function ReleasesTable({ store, rows, onRowClick, ariaLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => makeReleaseColumns(t, store), [t, store]);
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, columns]);
  const tableId = store === 'APP_STORE' ? 'tech-store-releases-apple' : 'tech-store-releases-play';

  return (
    <DuncitTable<StoreReleaseRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.appBuilds.releasesEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.appBuilds.releasesSearchPlaceholder')}
      onRowClick={onRowClick}
      ariaLabel={ariaLabel}
    />
  );
}
