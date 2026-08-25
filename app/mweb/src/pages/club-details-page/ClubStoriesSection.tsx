import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import MomentLightbox from '../../components/moments/MomentLightbox';
import ConfirmDialog from '../../components/ConfirmDialog';
import { isStoryLive, parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../../components/notify';
import { RECORD_STORY_VIEW } from '../home-page/queries';
import { CLUB_STORIES, DELETE_CLUB_STORY } from '../ClubDetailsPage/clubDetailsQueries';
import ClubStoryTiles, { type ClubStory } from './ClubStoryTiles';
import ReportStoryDialog from './ReportStoryDialog';
import StoryActionsMenu from './StoryActionsMenu';

interface Props {
  clubId: string;
  /**
   * Only a club's admins may post to its rail, so the Add tile is theirs alone.
   * The server refuses everyone else regardless — this is what stops a member
   * being shown a button that would only ever tell them no.
   */
  canPost: boolean;
}

/** Ephemeral 24h club stories — a rail of circular thumbnails the user can tap
 *  to view. The ring is the vibrant gradient while unseen and grey once seen
 *  (viewing is recorded per user, per story). Native twin (rule 27). */
export default function ClubStoriesSection({ clubId, canPost }: Readonly<Props>) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, refetch } = useQuery<{ clubStories: ClubStory[] }>(CLUB_STORIES, {
    variables: { id: clubId },
    skip: !clubId,
    fetchPolicy: 'cache-and-network',
    // Club pages stay open for a while — keep the 24h expiry honest without a
    // reload. The server filter is authoritative; this catches the boundary.
    pollInterval: 60_000,
  });
  const [recordView] = useMutation(RECORD_STORY_VIEW);
  const [deleteStory] = useMutation(DELETE_CLUB_STORY);
  // A story crossing its 24h boundary while this screen is open (or served
  // stale from the Apollo cache) must disappear, not linger until a reload.
  const stories = (data?.clubStories ?? []).filter((s) => isStoryLive(s.expires_at));
  const moments = stories.map((s) => ({ url: s.image_url, type: s.media_type }));
  const open = lightbox === null ? null : stories[lightbox];

  // Mark the story at `index` viewed (idempotent server-side; the mutation
  // returns `seen_by_me`, so the ring greys out via the Apollo cache).
  const markViewed = (index: number | null) => {
    if (index === null) return;
    const story = stories[index];
    if (story && !story.seen_by_me) {
      recordView({ variables: { id: story.id } }).catch(() => undefined);
    }
  };
  const showStory = (index: number | null) => {
    setLightbox(index);
    markViewed(index);
  };

  const removeStory = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await deleteStory({ variables: { id: open.id } });
      setConfirmDelete(false);
      setLightbox(null);
      await refetch();
      notify(t('contentReport.deleted'), 'success');
    } catch (e) {
      notify(parseApiError(e) || t('contentReport.deleteFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const actions = open ? (
    <StoryActionsMenu
      canDelete={!!open.can_delete}
      onDelete={() => setConfirmDelete(true)}
      onReport={() => setReporting(open.id)}
    />
  ) : null;

  return (
    <Box>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        <AutoStoriesIcon sx={{ fontSize: 15, mb: '-2px', mr: 0.5 }} />
        Stories
      </Typography>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ overflowX: 'auto', pt: 0.5, pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}
      >
        <ClubStoryTiles clubId={clubId} canPost={canPost} stories={stories} onOpen={showStory} />
      </Stack>
      <MomentLightbox
        moments={moments}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={showStory}
        actions={actions}
      />
      <ReportStoryDialog storyId={reporting} onClose={() => setReporting(null)} />
      <ConfirmDialog
        open={confirmDelete}
        title={t('contentReport.deleteConfirmTitle')}
        message={t('contentReport.deleteConfirmBody')}
        confirmLabel={t('contentReport.deleteConfirmCta')}
        cancelLabel={t('contentReport.deleteCancel')}
        destructive
        busy={busy}
        onConfirm={removeStory}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
}
