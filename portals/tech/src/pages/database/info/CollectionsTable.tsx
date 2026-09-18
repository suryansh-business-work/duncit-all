import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { formatBytes } from '../../server/format';
import type { DatabaseCollection } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const getCollectionRowId = (c: DatabaseCollection) => c.name;

/** A bytes column: sorts and filters on the raw number, shows it human-readable. */
const bytesColumn = (
  field: 'dataBytes' | 'storageBytes' | 'indexBytes' | 'avgDocumentBytes',
  headerName: string,
): DuncitColumn<DatabaseCollection> => ({
  field,
  headerName,
  type: 'number',
  width: 140,
  cellRenderer: (c) => formatBytes(c[field]),
});

const buildColumns = (t: Translate): DuncitColumn<DatabaseCollection>[] => [
  { field: 'name', headerName: t('tech.dbInfo.colCollection'), flex: 1, minWidth: 220, type: 'text' },
  {
    field: 'documents',
    headerName: t('tech.dbInfo.colDocuments'),
    type: 'number',
    width: 140,
    cellRenderer: (c) => c.documents.toLocaleString(),
  },
  bytesColumn('dataBytes', t('tech.dbInfo.colData')),
  bytesColumn('storageBytes', t('tech.dbInfo.colOnDisk')),
  bytesColumn('indexBytes', t('tech.dbInfo.colIndexSize')),
  { field: 'indexes', headerName: t('tech.dbInfo.colIndexes'), type: 'number', width: 110 },
  bytesColumn('avgDocumentBytes', t('tech.dbInfo.colAvgDocument')),
];

type Props = Readonly<{
  databaseName: string;
  fetchRows: TableFetch<DatabaseCollection>;
  refetchRef: MutableRefObject<(() => void) | null>;
}>;

/** Every collection of the live database with its size, largest on disk first. */
export default function CollectionsTable({ databaseName, fetchRows, refetchRef }: Props) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <SectionCard
      title={t('tech.dbInfo.collectionsTitle')}
      subtitle={t('tech.dbInfo.collectionsSubtitle', { vars: { database: databaseName } })}
    >
      <DuncitTable<DatabaseCollection>
        tableId="tech-database-collections"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getCollectionRowId}
        emptyText={t('tech.dbInfo.noCollections')}
        defaultSort={{ field: 'storageBytes', dir: 'desc' }}
        searchPlaceholder={t('tech.dbInfo.searchCollections')}
        refetchRef={refetchRef}
      />
    </SectionCard>
  );
}
