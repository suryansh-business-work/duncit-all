import { Card, Skeleton, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import type { LeaderboardBoardData } from './queries';
import IconDisc from '../account-page/IconDisc';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  board: LeaderboardBoardData | null;
  loading: boolean;
}

/** The hero: the caller's points and rank on the selected board, first on the
 * page so "your standing" reads before anyone else's. */
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
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('mweb.leaderboard.yourPoints')}
          </Typography>
          {loading && !board ? (
            <Skeleton variant="text" width={96} height={48} />
          ) : (
            <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15 }}>
              {board?.my_points ?? 0}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {rankLine}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {participantsLine}
          </Typography>
          {!board?.my_rank && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('mweb.leaderboard.notRankedHint')}
            </Typography>
          )}
        </Stack>
        <IconDisc size={64}>
          <EmojiEventsIcon />
        </IconDisc>
      </Stack>
    </Card>
  );
}
