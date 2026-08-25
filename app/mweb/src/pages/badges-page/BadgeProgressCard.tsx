import { Avatar, Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BADGE_GOAL_KEY, BADGE_WINDOW, BADGE_WINDOW_KEY, badgeProgressPercent } from '@duncit/utils';
import type { BadgeProgressRow } from './queries';
import { formatDate } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

/** One line of the card: a small caption over its value. */
function Line({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

/**
 * One badge as the member sees it: the artwork, what the badge is, the GOAL it
 * asks for, the WINDOW that goal has to happen in, and either how far along
 * they are or the day they got there.
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

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Avatar
            src={badge.image_url || undefined}
            sx={{
              width: 64,
              height: 64,
              bgcolor: row.achieved ? 'primary.light' : 'action.hover',
              // A locked badge is drawn back rather than hidden: the point of
              // the list is to show what is still there to be won.
              opacity: row.achieved ? 1 : 0.55,
            }}
          >
            {!badge.image_url && <EmojiEventsIcon />}
          </Avatar>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700 }}>{badge.title}</Typography>
              <Chip
                size="small"
                color={row.achieved ? 'success' : 'default'}
                icon={row.achieved ? <CheckCircleIcon /> : <LockOutlinedIcon />}
                label={row.achieved ? t('mweb.badges.achieved') : t('mweb.badges.locked')}
              />
            </Stack>
            {badge.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {badge.description}
              </Typography>
            )}
            <Line label={t('mweb.badges.goalLabel')} value={goal} />
            <Line label={t('mweb.badges.timelineLabel')} value={timeline} />
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {t('mweb.badges.progressLabel')}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {t('mweb.badges.progressValue', {
                    vars: { current: Math.min(row.current, row.target), target: row.target },
                  })}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={percent}
                color={row.achieved ? 'success' : 'primary'}
                aria-label={badge.title}
                sx={{ borderRadius: 1, height: 8, mt: 0.5 }}
              />
            </Box>
            {row.achieved_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('mweb.badges.achievedOn', { vars: { date: formatDate(row.achieved_at) } })}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
