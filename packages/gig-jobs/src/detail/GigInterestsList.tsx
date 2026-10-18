import { useQuery } from '@apollo/client/react';
import { Alert, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { GIG_JOB_INTERESTS } from '../documents';
import GigContactCard from './GigContactCard';

/** The poster's view of who said they are interested, each with their contact. */
export default function GigInterestsList({ jobId }: Readonly<{ jobId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(GIG_JOB_INTERESTS, {
    variables: { job_id: jobId },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.gigJobInterests ?? [];

  return (
    <Stack spacing={2} component="section" aria-labelledby="gig-interests-title" data-testid="gig-interests">
      <Typography id="gig-interests-title" variant="h6" component="h2">
        {t('gigJobs.interests.title')}
      </Typography>
      {error && !data && <Alert severity="error">{t('gigJobs.interests.loadFailed')}</Alert>}
      {loading && !data && <Skeleton variant="rounded" height={120} />}
      {data && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.interests.empty')}
        </Typography>
      )}
      {rows.map((row) => (
        <Stack key={row.id} spacing={1}>
          <GigContactCard contact={row.contact} title={row.freelancer_name} />
          {row.skills.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }} aria-label={t('gigJobs.interests.skills')}>
              {row.skills.map((skill) => (
                <Chip key={skill} size="small" label={skill} />
              ))}
            </Stack>
          )}
          {row.message && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {row.message}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
