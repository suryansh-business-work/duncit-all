import { alpha, Avatar, Box, Chip, List, Stack, Typography } from '@mui/material';
import { leaderboardMedal, type LeaderboardMedal } from '@duncit/utils';
import type { LeaderboardEntry } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Podium metals. Page-local colour constants like the coin page's gold — the
 * palette carries no medal semantics to reuse. */
const MEDAL_COLOR: Record<LeaderboardMedal, string> = {
  gold: '#F2A413',
  silver: '#9FA8B2',
  bronze: '#C77B45',
};

interface Props {
  rows: LeaderboardEntry[];
}

function PodiumSpot({ entry }: Readonly<{ entry: LeaderboardEntry }>) {
  const { t } = useTranslation();
  const medal = leaderboardMedal(entry.rank);
  const color = medal ? MEDAL_COLOR[medal] : 'transparent';
  const size = entry.rank === 1 ? 76 : 60;
  return (
    <Stack
      spacing={0.5}
      sx={{
        alignItems: "center",
        width: 96
      }}>
      <Avatar
        src={entry.avatar_url || undefined}
        sx={{ width: size, height: size, border: `3px solid ${color}` }}
      >
        {(entry.name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Chip
        size="small"
        label={`#${entry.rank}`}
        sx={{ bgcolor: alpha(color, 0.18), color, fontWeight: 700 }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }} noWrap>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
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
        alignItems: "center",
        px: 1.5,
        py: 1,
        borderRadius: '12px',
        ...(entry.is_me && { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) })
      }}>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          width: 32,
          fontWeight: 700
        }}>
        #{entry.rank}
      </Typography>
      <Avatar src={entry.avatar_url || undefined} sx={{ width: 36, height: 36 }}>
        {(entry.name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: entry.is_me ? 700 : 500 }} noWrap>
        {entry.name || t('mweb.leaderboard.anonymous')}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {entry.points}{' '}
        <Typography component="span" variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('mweb.leaderboard.pointsShort')}
        </Typography>
      </Typography>
    </Stack>
  );
}

/** The ranked board: a three-spot podium, then the plain rows. The caller's
 * own row is tinted so they can find themselves at a glance. */
export default function LeaderboardList({ rows }: Readonly<Props>) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          py: 4,
          textAlign: 'center'
        }}>
        {t('mweb.leaderboard.emptyBoard')}
      </Typography>
    );
  }

  const podium = rows.filter((entry) => leaderboardMedal(entry.rank) !== null);
  const rest = rows.filter((entry) => leaderboardMedal(entry.rank) === null);
  // Silver – gold – bronze, so #1 stands in the middle, a head taller.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "center",
          alignItems: "flex-end"
        }}>
        {podiumOrder.map((entry) => (
          <PodiumSpot key={entry.user_id} entry={entry} />
        ))}
      </Stack>
      <Box>
        <List disablePadding>
          {rest.map((entry) => (
            <BoardRow key={entry.user_id} entry={entry} />
          ))}
        </List>
      </Box>
    </Stack>
  );
}
