import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { QueryGuard } from '@duncit/ui';
import {
  ADMIN_LEADERBOARD_BOARD,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from './queries';
import {
  CATEGORIES,
  CATEGORY_LABEL_KEYS,
  PERIODS,
  PERIOD_LABEL_KEYS,
  type TranslateFn,
} from './labels';

interface BoardTableProps {
  rows: LeaderboardEntry[];
  t: TranslateFn;
}

function BoardTable({ rows, t }: Readonly<BoardTableProps>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell width={80}>{t('admin.leaderboard.colRank')}</TableCell>
          <TableCell>{t('admin.leaderboard.colUser')}</TableCell>
          <TableCell align="right">{t('admin.leaderboard.colPoints')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.user_id} hover selected={row.is_me}>
            <TableCell>{row.rank}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={row.avatar_url || undefined} sx={{ width: 28, height: 28 }} />
                <Typography variant="body2" fontWeight={row.is_me ? 700 : 400} noWrap>
                  {row.name}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell align="right">{row.points.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** One board at a time: pick a category and a ranking window, see the top rows. */
export default function BoardViewer() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<LeaderboardCategory>('USER');
  const [period, setPeriod] = useState<LeaderboardPeriod>('MONTH');

  const { data, loading, error } = useQuery(ADMIN_LEADERBOARD_BOARD, {
    variables: { category, period },
    fetchPolicy: 'cache-and-network',
  });
  const rows: LeaderboardEntry[] = data?.leaderboard?.rows ?? [];

  let body: ReactNode;
  if (error) {
    body = <Alert severity="error">{t('admin.leaderboard.boardError')}</Alert>;
  } else if (loading && !data) {
    body = <QueryGuard loading spinnerSx={{ p: 4 }} />;
  } else if (rows.length === 0) {
    body = <Alert severity="info">{t('admin.leaderboard.boardEmpty')}</Alert>;
  } else {
    body = <BoardTable rows={rows} t={t} />;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <TextField
            select
            size="small"
            label={t('admin.leaderboard.rewardCategory')}
            value={category}
            onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
            sx={{ minWidth: 220 }}
          >
            {CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(CATEGORY_LABEL_KEYS[value])}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, next: LeaderboardPeriod | null) => {
              if (next) setPeriod(next);
            }}
          >
            {PERIODS.map((value) => (
              <ToggleButton key={value} value={value}>
                {t(PERIOD_LABEL_KEYS[value])}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {body}
      </Stack>
    </Paper>
  );
}
