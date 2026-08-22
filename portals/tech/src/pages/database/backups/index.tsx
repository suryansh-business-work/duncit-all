import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from '@duncit/shell';
import BackupScheduleCard from './BackupScheduleCard';
import BackupsTable from './BackupsTable';
import RestoreDialog from './RestoreDialog';
import RestoreProgress from './RestoreProgress';
import { useBackups } from './useBackups';

/**
 * Database > Backups.
 *
 * One row per backup run, the schedule that produces them, and the three things
 * an operator does with an archive: download it, restore from it, delete it.
 *
 * The page only starts a run — the archive is written on the server, so this is
 * a viewer. It polls while a backup or a restore is moving and stops the moment
 * neither is.
 */
export default function DbBackupsPage() {
  const { t } = useTranslation();
  const page = useBackups();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <BackupIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            {t('tech.dbBackup.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('tech.dbBackup.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={page.onRunNow}
          disabled={page.running || page.starting}
        >
          {page.starting ? t('tech.dbBackup.starting') : t('tech.dbBackup.runNow')}
        </Button>
      </Stack>

      {(page.settingsLoading || page.starting) && <LinearProgress />}

      {/* Without this the query's own failure — most often "not authorised",
          since every backup operation is SUPER_ADMIN-only — renders an empty
          page with a disabled button and no reason given. */}
      {page.settingsQueryError && <Alert severity="error">{page.settingsQueryError}</Alert>}

      {page.settings && (
        <BackupScheduleCard
          settings={page.settings}
          saving={page.saving}
          error={page.settingsError}
          onSave={page.onSaveSettings}
        />
      )}

      {page.restore && <RestoreProgress job={page.restore} />}

      <BackupsTable
        fetchRows={page.fetchRows}
        refetchRef={page.refetchRef}
        onDownload={page.onDownload}
        onRestore={page.setRestoreTarget}
        onDelete={page.onDelete}
      />

      {page.restoreTarget && (
        <RestoreDialog
          backup={page.restoreTarget}
          busy={page.restoring}
          onClose={() => page.setRestoreTarget(null)}
          onConfirm={page.onConfirmRestore}
        />
      )}
    </Stack>
  );
}
