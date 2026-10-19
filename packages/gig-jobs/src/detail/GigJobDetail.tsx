import { useQuery } from '@apollo/client/react';
import { Alert, Divider, Skeleton, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget } from '@duncit/logs';
import { useTranslation } from '@duncit/app-settings';
import { GIG_JOBS_PATH } from '@duncit/utils';
import { GIG_JOB } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';
import { useGigContext } from '../useGigContext';
import GigContactCard from './GigContactCard';
import GigInterestsList from './GigInterestsList';
import GigJobFacts from './GigJobFacts';
import GigViewerActions from './GigViewerActions';

/** One gig: what it is, what this viewer can do, and — once shared — the contact. */
export default function GigJobDetail({ id }: Readonly<{ id: string }>) {
  const { t } = useTranslation();
  const { go, logger } = useGigSurface();
  const { viewer } = useGigContext();
  const { data, loading, error, refetch } = useQuery(GIG_JOB, { variables: { id }, fetchPolicy: 'cache-and-network' });
  const job = data?.gigJob ?? null;

  const back = (
    <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => go(GIG_JOBS_PATH)} sx={{ alignSelf: 'flex-start' }}>
      {t('gigJobs.detail.back')}
    </DuncitButton>
  );

  if (loading && !data) {
    return (
      <Stack spacing={2} aria-busy="true">
        <Skeleton variant="text" height={48} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    );
  }
  if (error && !data) {
    return (
      <Stack spacing={2}>
        {back}
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => fireAndForget(refetch(), logger, 'gig-detail', 'retry')}>
              {t('gigJobs.board.retry')}
            </DuncitButton>
          }
        >
          {t('gigJobs.board.loadFailed')}
        </Alert>
      </Stack>
    );
  }
  if (!job) {
    return (
      <Stack spacing={2}>
        {back}
        <Alert severity="info">{t('gigJobs.detail.notFound')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} data-testid="gig-detail">
      {back}
      <GigJobFacts job={job} />
      <GigViewerActions job={job} viewer={viewer} />
      {job.contact && !job.is_mine && <GigContactCard contact={job.contact} />}
      {job.is_mine && (
        <>
          <Divider />
          <GigInterestsList jobId={job.id} />
        </>
      )}
    </Stack>
  );
}
