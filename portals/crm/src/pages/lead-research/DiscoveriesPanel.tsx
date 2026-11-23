import { useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { EmptyState } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import DiscoveryDialog from './DiscoveryDialog';
import DiscoveryJobCard from './DiscoveryJobCard';
import { useDiscoveryJobs } from './useDiscoveryJobs';

interface Props {
  /** Narrow the review queue to one discovery's candidates. */
  onShowCandidates: (jobId: string) => void;
}

/** Recent discoveries, newest first, and the way to start a new one. */
export default function DiscoveriesPanel({ onShowCandidates }: Readonly<Props>) {
  const { t } = useTranslation();
  const discoveries = useDiscoveryJobs();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { jobs, loading, error } = discoveries;
  const reload = () => fireAndForget(discoveries.refetch(), logs.portal.crm, 'LeadResearch', 'reloadDiscoveries');

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
            {t('crm.leadResearch.discoveriesTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.leadResearch.discoveriesHint')}
          </Typography>
        </Box>
        <DuncitButton variant="contained" startIcon={<TravelExploreIcon />} onClick={() => setDialogOpen(true)} data-testid="discover-leads">
          {t('crm.leadResearch.discoverLeads')}
        </DuncitButton>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={reload}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error)}
        </Alert>
      ) : null}

      {loading && jobs.length === 0 ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress aria-label={t('crm.leadResearch.loadingDiscoveries')} />
        </Stack>
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState
          compact
          icon={<TravelExploreIcon />}
          title={t('crm.leadResearch.noDiscoveries')}
          body={t('crm.leadResearch.noDiscoveriesBody')}
          data-testid="discoveries-empty"
        />
      ) : null}

      {jobs.length > 0 ? (
        <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0 }} aria-label={t('crm.leadResearch.discoveriesTitle')}>
          {jobs.map((job) => (
            <DiscoveryJobCard
              key={job.id}
              job={job}
              busy={discoveries.busyId === job.id}
              error={discoveries.actionError?.jobId === job.id ? discoveries.actionError.message : null}
              onCancel={discoveries.cancel}
              onRetry={discoveries.retry}
              onShowCandidates={onShowCandidates}
            />
          ))}
        </Stack>
      ) : null}

      {dialogOpen ? <DiscoveryDialog onClose={() => setDialogOpen(false)} /> : null}
    </Stack>
  );
}
