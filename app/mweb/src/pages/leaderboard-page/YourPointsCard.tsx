import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { LeaderboardBoardData } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  board: LeaderboardBoardData | null;
  loading: boolean;
}

/** The hero: the caller's points and rank on the selected board, on a primary
 * gradient so "your standing" reads before anyone else's. */
export default function YourPointsCard({ board, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  const participants = board?.participants ?? 0;
  const participantsLine =
    participants === 1
      ? t('mweb.leaderboard.participantsOne')
      : t('mweb.leaderboard.participantsMany', { count: participants });
  const rankLine = board?.my_rank
    ? t('mweb.leaderboard.yourRank', { vars: { rank: board.my_rank } })
    : t('mweb.leaderboard.notRanked');

  return (
    <Card
      sx={{
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        color: 'primary.contrastText',
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>
              {t('mweb.leaderboard.yourPoints')}
            </Typography>
            {loading && !board ? (
              <Skeleton variant="text" width={96} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                {board?.my_points ?? 0}
              </Typography>
            )}
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {rankLine}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {participantsLine}
            </Typography>
            {!board?.my_rank && (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                {t('mweb.leaderboard.notRankedHint')}
              </Typography>
            )}
          </Stack>
          <EmojiEventsIcon sx={{ fontSize: 72, opacity: 0.9 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
