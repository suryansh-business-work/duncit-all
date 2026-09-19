import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import InfoList, { type InfoRowItem } from '../../server/InfoList';
import { formatBytes, formatDateTime } from '../../server/format';
import { DB_BACKUP_STORE, takenAt, type BackupRow, type BackupStore } from './queries';
import { useBackupDownload } from './useBackupDownload';

type Translate = ReturnType<typeof useTranslation>['t'];

function storeRows(store: BackupStore, t: Translate): InfoRowItem[] {
  return [
    {
      label: t('tech.dbBackup.storeLocation'),
      value: t('tech.dbBackup.storeLocationValue', { vars: { directory: store.directory } }),
    },
    {
      label: t('tech.dbBackup.storeArchives'),
      value: t('tech.dbBackup.storeArchivesValue', {
        vars: { count: store.archives, size: formatBytes(store.archiveBytes) },
      }),
    },
    {
      label: t('tech.dbBackup.storeVolume'),
      value: t('tech.dbBackup.storeVolumeValue', {
        vars: { free: formatBytes(store.fsFreeBytes), total: formatBytes(store.fsTotalBytes) },
      }),
    },
    { label: t('tech.dbBackup.storeNewest'), value: formatDateTime(store.newestArchiveAt) },
  ];
}

/** The newest completed archive, with the one action a copy elsewhere needs. */
function LatestBackup({ latest }: Readonly<{ latest: BackupRow | null }>) {
  const { t } = useTranslation();
  const onDownload = useBackupDownload();
  if (!latest) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.dbBackup.storeNone')}
      </Typography>
    );
  }
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      useFlexGap
      sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap' }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t('tech.dbBackup.storeLatest')}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }} data-testid="backup-store-latest">
          {t('tech.dbBackup.storeLatestValue', {
            vars: {
              file: latest.fileName ?? '',
              size: formatBytes(latest.sizeBytes),
              at: formatDateTime(takenAt(latest)),
            },
          })}
        </Typography>
      </Stack>
      <DuncitButton
        size="small"
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={() => onDownload(latest)}
        data-testid="backup-store-download"
      >
        {t('tech.dbBackup.storeDownloadLatest')}
      </DuncitButton>
    </Stack>
  );
}

/**
 * Where this server keeps its archives — a directory on its own disk — and the
 * newest one to download. Self-contained so Database › Info and Database ›
 * Backups mount the same card; `action` is the title-row slot (Info puts its
 * link to Backups there).
 */
export default function BackupStoreCard({ action }: Readonly<{ action?: ReactNode }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ dbBackupStore: BackupStore }>(DB_BACKUP_STORE, {
    fetchPolicy: 'cache-and-network',
  });
  const store = data?.dbBackupStore;

  return (
    <SectionCard title={t('tech.dbBackup.storeTitle')} subtitle={t('tech.dbBackup.storeSubtitle')} action={action}>
      <Stack spacing={1.5}>
        {loading && !store && <LinearProgress />}
        {error && (
          <Alert severity="error">{t('tech.dbBackup.storeLoadError', { vars: { message: error.message } })}</Alert>
        )}
        {store && (
          <>
            <InfoList rows={storeRows(store, t)} />
            <LatestBackup latest={store.latest} />
            <Alert severity="warning">{t('tech.dbBackup.storeOnlyHere')}</Alert>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
