import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { GIG_POST_PATH } from '@duncit/utils';
import { useGigSurface } from '../GigSurfaceProvider';
import GigJobList from './GigJobList';
import { useMyGigs } from './usePagedGigs';

/** The viewer's own gig posts, open and closed — each opens to its interested freelancers. */
export default function MyGigJobs() {
  const { t } = useTranslation();
  const { go } = useGigSurface();
  const mine = useMyGigs();

  return (
    <Stack spacing={3} data-testid="my-gigs">
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.mine.title')}
        </Typography>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => go(GIG_POST_PATH)}>
          {t('gigJobs.board.postGig')}
        </DuncitButton>
      </Stack>
      <GigJobList
        rows={mine.rows}
        total={mine.total}
        loading={mine.loading}
        error={mine.error}
        emptyTitle={t('gigJobs.mine.empty')}
        onRetry={mine.retry}
        onMore={mine.more}
      />
    </Stack>
  );
}
