import { Avatar, Card, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import { BADGE_GOAL_KEY, BADGE_WINDOW, BADGE_WINDOW_KEY, badgeProgressPercent } from '@duncit/utils';
import type { BadgeProgressRow } from './queries';
import { formatDate } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

const META_SX = { color: 'text.secondary', fontSize: 12, lineHeight: 1.35 } as const;

/**
 * One badge as a tile: the artwork, what the badge is, the GOAL it asks for,
 * how far along the member is, the WINDOW that goal has to happen in, and the
 * day they got there. A locked badge is drawn back on the soft fill rather than
 * hidden — the point of the grid is to show what is still there to be won.
 *
 * Twin of the native <BadgeProgressCard/> (rule 27) — both read their goal and
 * window vocabulary from @duncit/utils, so the two can never promise different
 * things for the same badge.
 */
export default function BadgeProgressCard({ row }: Readonly<{ row: BadgeProgressRow }>) {
  const { t } = useTranslation();
  const { badge } = row;
  const percent = badgeProgressPercent(row);
  const goal = t(BADGE_GOAL_KEY[badge.condition_type], { vars: { target: row.target } });
  const timeline = t(BADGE_WINDOW_KEY[BADGE_WINDOW[badge.condition_type]]);
  const progress = t('mweb.badges.progressValue', {
    vars: { current: Math.min(row.current, row.target), target: row.target },
  });

  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', height: '100%' }}>
        <Avatar
          src={badge.image_url || undefined}
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'action.hover',
            color: row.achieved ? 'secondary.main' : 'text.secondary',
            opacity: row.achieved ? 1 : 0.55,
          }}
        >
          {!badge.image_url && <EmojiEventsIcon />}
        </Avatar>
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{badge.title}</Typography>
        <Chip
          size="small"
          color={row.achieved ? 'success' : 'default'}
          icon={row.achieved ? <CheckCircleIcon /> : <LockOutlinedIcon />}
          label={row.achieved ? t('mweb.badges.achieved') : t('mweb.badges.locked')}
          sx={{ height: 24, fontSize: 11 }}
        />
        {badge.description && <Typography sx={META_SX}>{badge.description}</Typography>}
        <Typography sx={{ ...META_SX, color: 'text.primary', fontWeight: 500 }}>{goal}</Typography>
        <Stack spacing={0.5} sx={{ width: '100%', mt: 'auto', pt: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={percent}
            color={row.achieved ? 'success' : 'primary'}
            aria-label={badge.title}
            sx={{ height: 4 }}
          />
          <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{progress}</Typography>
        </Stack>
        <Typography sx={{ ...META_SX, fontSize: 11 }}>{timeline}</Typography>
        {row.achieved_at && (
          <Typography sx={{ ...META_SX, fontSize: 11 }}>
            {t('mweb.badges.achievedOn', { vars: { date: formatDate(row.achieved_at) } })}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
