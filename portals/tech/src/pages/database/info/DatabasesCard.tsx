import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import InfoList, { type InfoRowItem } from '../../server/InfoList';
import { formatBytes } from '../../server/format';
import type { DatabaseEntry } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

function storageRows(d: DatabaseEntry, t: Translate): InfoRowItem[] {
  const onDisk = { label: t('tech.dbInfo.dbOnDisk'), value: formatBytes(d.sizeOnDisk) };
  if (!d.storage) return [onDisk];
  const s = d.storage;
  return [
    onDisk,
    { label: t('tech.dbInfo.dbDocuments'), value: s.documents.toLocaleString() },
    { label: t('tech.dbInfo.dbCollections'), value: String(s.collections) },
    { label: t('tech.dbInfo.dbData'), value: formatBytes(s.dataBytes) },
    {
      label: t('tech.dbInfo.dbIndexes'),
      value: t('tech.dbInfo.dbIndexesValue', { vars: { count: s.indexes, size: formatBytes(s.indexBytes) } }),
    },
  ];
}

function DatabaseTile({ database: d }: Readonly<{ database: DatabaseEntry }>) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid={`db-info-database-${d.name}`}
      sx={{ border: 1, borderColor: d.isLive ? 'primary.main' : 'divider', borderRadius: 1, p: 1.5 }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="subtitle2" component="h3" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {d.name}
        </Typography>
        {d.isLive && <Chip size="small" color="primary" label={t('tech.dbInfo.liveChip')} />}
        {d.empty && <Chip size="small" label={t('tech.dbInfo.dbEmptyChip')} />}
      </Stack>
      <InfoList rows={storageRows(d, t)} />
      {d.statsError && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('tech.dbInfo.dbStatsDenied', { vars: { message: d.statsError } })}
        </Alert>
      )}
    </Box>
  );
}

type Props = Readonly<{ databases: DatabaseEntry[]; error: string | null }>;

/**
 * Every database on the same mongod that this API's user can read — since the
 * move off Atlas that is production, staging and Lite side by side — with the
 * live one marked.
 */
export default function DatabasesCard({ databases, error }: Props) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.dbInfo.databasesTitle')} subtitle={t('tech.dbInfo.databasesSubtitle')}>
      <Stack spacing={1.5}>
        {error && <Alert severity="info">{t('tech.dbInfo.databasesDenied', { vars: { message: error } })}</Alert>}
        {!error && databases.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.dbInfo.databasesEmpty')}
          </Typography>
        )}
        {databases.length > 0 && (
          <Box
            data-testid="db-info-databases"
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            }}
          >
            {databases.map((d) => (
              <DatabaseTile key={d.name} database={d} />
            ))}
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
}
