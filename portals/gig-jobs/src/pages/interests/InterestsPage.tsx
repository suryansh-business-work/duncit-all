import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import InterestsTable from './InterestsTable';

/** Every "I'm interested" across Duncit — who, on which gig, and the contact shared. */
export default function InterestsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.interests.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.console.interestsSubtitle')}
        </Typography>
      </Stack>
      <InterestsTable />
    </Stack>
  );
}
