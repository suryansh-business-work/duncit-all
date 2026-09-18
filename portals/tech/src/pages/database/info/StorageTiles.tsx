import { Box } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import Tile from '../../server/ServerStatCard';
import { formatBytes } from '../../server/format';
import type { DatabaseStorage } from './queries';

/** The volume mongod writes to — only a self-hosted server reports it. */
function VolumeTile({ used, total }: Readonly<{ used: number; total: number }>) {
  const { t } = useTranslation();
  return (
    <Tile
      label={t('tech.dbInfo.tileVolume')}
      value={formatBytes(used)}
      sub={t('tech.server.ofTotal', { vars: { total: formatBytes(total) } })}
      percent={Math.round((used / total) * 1000) / 10}
    />
  );
}

/** Headline sizes of the live database, in the Server · Info tile style. */
export default function StorageTiles({ storage: s }: Readonly<{ storage: DatabaseStorage }>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
      }}
    >
      <Tile
        label={t('tech.dbInfo.tileData')}
        value={formatBytes(s.dataBytes)}
        sub={t('tech.dbInfo.tileDataSub', { vars: { count: s.documents.toLocaleString() } })}
      />
      <Tile
        label={t('tech.dbInfo.tileOnDisk')}
        value={formatBytes(s.totalBytes)}
        sub={t('tech.dbInfo.tileOnDiskSub')}
      />
      <Tile
        label={t('tech.dbInfo.tileIndexes')}
        value={formatBytes(s.indexBytes)}
        sub={t('tech.dbInfo.tileIndexesSub', { vars: { count: s.indexes } })}
      />
      <Tile
        label={t('tech.dbInfo.tileCollections')}
        value={String(s.collections)}
        sub={t('tech.dbInfo.tileCollectionsSub', { vars: { size: formatBytes(s.avgDocumentBytes) } })}
      />
      {s.fsUsedBytes !== null && s.fsTotalBytes !== null && (
        <VolumeTile used={s.fsUsedBytes} total={s.fsTotalBytes} />
      )}
    </Box>
  );
}
