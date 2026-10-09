import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import RunFilesTable from './RunFilesTable';
import RunsTable from './RunsTable';
import { useMediaOrganizer } from './useMediaOrganizer';

/**
 * Database > Media Organizer.
 *
 * Starts the job that files every ImageKit upload into its owner's folder,
 * lists the runs, and opens one run's files. The work is a background job —
 * its progress lives in the header — so this page only starts, lists and
 * explains.
 */
export default function MediaOrganizerPage() {
  const { t } = useTranslation();
  const page = useMediaOrganizer();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <ImageIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('tech.mediaOrganizer.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.mediaOrganizer.subtitle')}
          </Typography>
        </Box>
        <DuncitButton
          variant="outlined"
          startIcon={<TravelExploreIcon />}
          title={t('tech.mediaOrganizer.dryRunHint')}
          data-testid="media-organizer-dry-run"
          onClick={() => page.start(true)}
          disabled={page.busy}
        >
          {t('tech.mediaOrganizer.dryRun')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={<PlayArrowIcon />}
          data-testid="media-organizer-start"
          onClick={() => page.start(false)}
          disabled={page.busy}
        >
          {page.starting ? t('tech.mediaOrganizer.starting') : t('tech.mediaOrganizer.organize')}
        </DuncitButton>
      </Stack>

      <Alert severity="info">
        <Typography variant="body2">{t('tech.mediaOrganizer.howItWorks')}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t('tech.mediaOrganizer.newUploads')}
        </Typography>
      </Alert>

      {page.running && (
        <Alert severity="warning" role="status">
          {t('tech.mediaOrganizer.running')}
        </Alert>
      )}
      {page.loading && <LinearProgress />}
      {page.loadError && <Alert severity="error">{page.loadError}</Alert>}

      <Typography variant="h6" component="h2">
        {t('tech.mediaOrganizer.runsTitle')}
      </Typography>
      <RunsTable
        runs={page.runs}
        busy={page.busy}
        onView={page.setSelectedRun}
        onApply={page.apply}
        onRollback={page.rollback}
      />

      {page.selectedRun && (
        <>
          <Typography variant="h6" component="h2">
            {t('tech.mediaOrganizer.filesTitle')}
          </Typography>
          <RunFilesTable key={page.selectedRun} runId={page.selectedRun} />
        </>
      )}
    </Stack>
  );
}
