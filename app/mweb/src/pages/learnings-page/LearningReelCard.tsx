import { useCallback } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ShareIcon from '@mui/icons-material/Share';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatTutorialDuration, hasWatchedEnough } from '@duncit/utils';
import ExploreReelVideo from '../explore-page/ExploreReelVideo';
import ExploreActionRail, { type ExploreAction } from '../explore-page/ExploreActionRail';
import { useTranslation } from '../../i18n/useTranslation';
import type { LearningCard } from './queries';

interface Props {
  card: LearningCard;
  topicLabel: string;
  active: boolean;
  preload: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onSoundBlocked: () => void;
  onLike: (card: LearningCard) => void;
  onComments: (card: LearningCard) => void;
  onShare: (card: LearningCard) => void;
  onWatched: (card: LearningCard) => void;
}

const glassChip = (theme: Theme) => ({
  height: 26,
  bgcolor: alpha(theme.palette.common.white, 0.16),
  color: 'common.white',
  fontWeight: 600,
  backdropFilter: 'blur(8px)',
  '& .MuiChip-icon': { color: 'common.white', fontSize: 15 },
});

/** Bottom-up scrim so the white caption reads on any frame, in either theme. */
const scrim = (theme: Theme) =>
  `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.78)} 0%, ${alpha(theme.palette.common.black, 0)} 55%)`;

/** One full-height Learnings reel: the video, its caption and the action rail. Native twin: TutorialReel. */
export default function LearningReelCard(props: Readonly<Props>) {
  const { card, topicLabel, active, preload, soundOn, onToggleSound, onSoundBlocked, onLike, onComments, onShare, onWatched } = props;
  const { t } = useTranslation();
  const onTime = useCallback(
    (position: number, duration: number) => {
      if (hasWatchedEnough(position, duration)) onWatched(card);
    },
    [card, onWatched],
  );

  const actions: ExploreAction[] = [
    {
      key: 'like',
      testId: `learning-like-${card.id}`,
      icon: card.liked_by_me ? <FavoriteIcon /> : <FavoriteBorderIcon />,
      label: card.liked_by_me ? t('mweb.tutorials.unlike') : t('mweb.tutorials.like'),
      ariaLabel: card.liked_by_me ? t('mweb.tutorials.unlike') : t('mweb.tutorials.like'),
      tooltip: t('mweb.tutorials.likesA11y', { vars: { count: card.like_count } }),
      caption: String(card.like_count),
      active: card.liked_by_me,
      onClick: () => onLike(card),
    },
    {
      key: 'comments',
      testId: `learning-comments-${card.id}`,
      icon: <ChatBubbleOutlineIcon />,
      label: t('mweb.tutorials.comment'),
      ariaLabel: t('mweb.tutorials.commentsA11y', { vars: { count: card.comment_count } }),
      caption: String(card.comment_count),
      onClick: () => onComments(card),
    },
    {
      key: 'share',
      testId: `learning-share-${card.id}`,
      icon: <ShareIcon />,
      label: t('mweb.tutorials.share'),
      ariaLabel: t('mweb.tutorials.share'),
      onClick: () => onShare(card),
    },
    {
      key: 'sound',
      testId: `learning-sound-${card.id}`,
      icon: soundOn ? <VolumeUpIcon /> : <VolumeOffIcon />,
      label: soundOn ? t('mweb.tutorials.mute') : t('mweb.tutorials.unmute'),
      ariaLabel: soundOn ? t('mweb.tutorials.mute') : t('mweb.tutorials.unmute'),
      onClick: onToggleSound,
    },
  ];

  return (
    <Box data-testid={`learning-card-${card.id}`} sx={{ position: 'relative', height: '100%', bgcolor: 'common.black', overflow: 'hidden' }}>
      <ExploreReelVideo
        src={card.video_url}
        poster={card.thumbnail_url}
        muted={!soundOn}
        active={active}
        preload={preload}
        loop={false}
        onSoundBlocked={onSoundBlocked}
        onTimeUpdate={onTime}
        onEnded={() => onWatched(card)}
        ariaLabel={t('mweb.tutorials.videoLabel', { vars: { title: card.title } })}
        testId={`learning-video-${card.id}`}
      />
      <Box aria-hidden sx={(theme) => ({ position: 'absolute', inset: 0, background: scrim(theme), pointerEvents: 'none' })} />
      {card.watched_by_me && (
        <Chip
          data-testid={`learning-watched-${card.id}`}
          icon={<CheckCircleIcon />}
          label={t('mweb.tutorials.watched')}
          aria-label={t('mweb.tutorials.watchedA11y')}
          size="small"
          sx={(theme) => ({ ...glassChip(theme), position: 'absolute', top: 12, left: 12, bgcolor: 'success.main' })}
        />
      )}
      <ExploreActionRail actions={actions} />
      <Stack spacing={1} sx={{ position: 'absolute', left: 16, right: 80, bottom: 24, color: 'common.white' }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {topicLabel && <Chip size="small" label={topicLabel} sx={glassChip} />}
          {card.duration_sec > 0 && (
            <Chip size="small" icon={<ScheduleIcon />} label={formatTutorialDuration(card.duration_sec)} sx={glassChip} />
          )}
        </Stack>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          {card.title}
        </Typography>
        {card.description && (
          <Typography variant="body2" sx={{ opacity: 0.9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {card.description}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
