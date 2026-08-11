import { Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from '@duncit/app-settings';
import BoardStatsCards from './BoardStatsCards';
import BoardViewer from './BoardViewer';

/** Admin > Leaderboard > Boards — headline stats per board plus a live board viewer. */
export default function LeaderboardBoardsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <EmojiEventsIcon color="primary" />
        <Stack>
          <Typography variant="h5" fontWeight={700}>
            {t('admin.leaderboard.boardsTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.leaderboard.boardsSubtitle')}
          </Typography>
        </Stack>
      </Stack>

      <BoardStatsCards />
      <BoardViewer />
    </Stack>
  );
}
