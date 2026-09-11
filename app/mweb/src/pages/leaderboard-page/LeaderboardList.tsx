import { alpha, Avatar, Box, Card, Divider, Stack, Typography } from '@mui/material';
import { leaderboardMedal, type LeaderboardMedal } from '@duncit/utils';
import type { LeaderboardEntry } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Podium metals as theme tokens — gold, silver, bronze — so the ring flips
 * with light/dark like every other colour. Native twin: LeaderboardBoardList. */
const MEDAL_TONE: Record<LeaderboardMedal, string> = {
  gold: 'warning.main',
  silver: 'text.secondary',
  bronze: 'secondary.main',
};

interface Props {
  rows: LeaderboardEntry[];
}

/** The small soft pill a rank sits in. */
function RankPill({ rank, color = 'text.primary' }: Readonly<{ rank: number; color?: string }>) {
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        minWidth: 32,
        height: 22,
        borderRadius: 999,
        bgcolor: 'action.hover',
        color,
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      #{rank}
    </Box>
  );
}

function PodiumSpot({ entry }: Readonly<{ entry: LeaderboardEntry }>) {
  const { t } = useTranslation();
  const medal = leaderboardMedal(entry.rank);
  const color = medal ? MEDAL_TONE[medal] : 'transparent';
  const size = entry.rank === 1 ? 76 : 60;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'center', width: 96, minWidth: 0 }}>
      <Avatar
        src={entry.avatar_url || undefined}
        sx={{ width: size, height: size, border: 3, borderColor: color, fontWeight: 600 }}
      >
        {(entry.name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <RankPill rank={entry.rank} color={color} />
      <Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: 'center', maxWidth: '100%' }} noWrap>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {entry.points} {t('mweb.leaderboard.pointsShort')}
      </Typography>
    </Stack>
  );
}

function BoardRow({ entry }: Readonly<{ entry: LeaderboardEntry }>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        px: 2,
        py: 1.25,
        ...(entry.is_me && { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) }),
      }}
    >
      <RankPill rank={entry.rank} />
      <Avatar src={entry.avatar_url || undefined} sx={{ width: 36, height: 36, fontWeight: 600 }}>
        {(entry.name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: entry.is_me ? 600 : 500 }} noWrap>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {entry.points}{' '}
        <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.leaderboard.pointsShort')}
        </Typography>
      </Typography>
    </Stack>
  );
}

/** The ranked board in one card: a three-spot podium, then the plain rows. The
 * caller's own row is tinted so they can find themselves at a glance. */
export default function LeaderboardList({ rows }: Readonly<Props>) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
        {t('mweb.leaderboard.emptyBoard')}
      </Typography>
    );
  }

  const podium = rows.filter((entry) => leaderboardMedal(entry.rank) !== null);
  const rest = rows.filter((entry) => leaderboardMedal(entry.rank) === null);
  // Silver – gold – bronze, so #1 stands in the middle, a head taller.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <Card>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'flex-end', p: 2 }}>
        {podiumOrder.map((entry) => (
          <PodiumSpot key={entry.user_id} entry={entry} />
        ))}
      </Stack>
      {rest.length > 0 && (
        <>
          <Divider />
          <Stack divider={<Divider />}>
            {rest.map((entry) => (
              <BoardRow key={entry.user_id} entry={entry} />
            ))}
          </Stack>
        </>
      )}
    </Card>
  );
}
