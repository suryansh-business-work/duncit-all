import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import LeaderboardPointsTable from './LeaderboardPointsTable';
import { ADMIN_LEADERBOARD_POINTS_TABLE, type LeaderboardPointRow } from './queries';

/** Admin > Leaderboard > Points Ledger — every points award, newest first. */
export default function LeaderboardPointsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<LeaderboardPointRow>(
    client,
    ADMIN_LEADERBOARD_POINTS_TABLE,
    'leaderboardPointsTable',
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <ReceiptLongIcon color="primary" />
        <Stack>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {t('admin.leaderboard.ledgerTitle')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('admin.leaderboard.ledgerSubtitle')}
          </Typography>
        </Stack>
      </Stack>

      <LeaderboardPointsTable fetchRows={fetchRows} />
    </Stack>
  );
}
