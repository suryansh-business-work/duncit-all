import { useCallback, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { GIG_POST_PATH, MY_GIGS_PATH, canPostGigs, gigBoardFilter, type GigJobFilter } from '@duncit/utils';
import { useGigSurface } from '../GigSurfaceProvider';
import { useGigContext } from '../useGigContext';
import GigFilters from './GigFilters';
import GigJobList from './GigJobList';
import { useGigBoard } from './usePagedGigs';

/**
 * The Gig Jobs board: every open gig, newest first, for anyone signed in.
 * Posting is for hosts, venue owners and brand owners; showing interest is for
 * freelancers, who join from Earn with Duncit.
 */
export default function GigBoard() {
  const { t } = useTranslation();
  const { go, openFreelancerProfile, selectedLocationId } = useGigSurface();
  const { categories, viewer } = useGigContext();
  // Null until the viewer touches a filter: the board follows the selected city.
  const [picked, setPicked] = useState<GigJobFilter | null>(null);
  const filter = useMemo(() => gigBoardFilter(picked, selectedLocationId), [picked, selectedLocationId]);
  const onFilter = useCallback((next: GigJobFilter) => setPicked(next), []);
  const board = useGigBoard(filter);
  const canPost = canPostGigs(viewer);

  return (
    <Stack spacing={3} data-testid="gig-board">
      <Stack spacing={1}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.board.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.board.subtitle')}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {canPost && (
          <>
            <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => go(GIG_POST_PATH)}>
              {t('gigJobs.board.postGig')}
            </DuncitButton>
            <DuncitButton variant="outlined" startIcon={<ListAltIcon />} onClick={() => go(MY_GIGS_PATH)}>
              {t('gigJobs.board.myPosts')}
            </DuncitButton>
          </>
        )}
        {viewer && (
          <DuncitButton variant="outlined" startIcon={<BadgeOutlinedIcon />} onClick={openFreelancerProfile}>
            {viewer.is_freelancer ? t('gigJobs.board.myProfile') : t('gigJobs.board.joinAsFreelancer')}
          </DuncitButton>
        )}
      </Stack>

      {viewer && !viewer.is_freelancer && <Alert severity="info">{t('gigJobs.board.freelancerHint')}</Alert>}

      <GigFilters categories={categories} value={filter} onChange={onFilter} />

      <GigJobList
        rows={board.rows}
        total={board.total}
        loading={board.loading}
        error={board.error}
        emptyTitle={t('gigJobs.board.empty')}
        emptyHint={t('gigJobs.board.emptyHint')}
        onRetry={board.retry}
        onMore={board.more}
      />
    </Stack>
  );
}
