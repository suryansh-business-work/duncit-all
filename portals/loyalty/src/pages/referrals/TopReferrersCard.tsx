import { Box, LinearProgress, List, ListItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from '../../components/ChartCard';
import { coinCount } from '../duncit-coin/queries';
import { codeChip } from './cells';
import type { TopReferrer } from './queries';

interface Props {
  rows: TopReferrer[];
  loading: boolean;
}

/** The members whose codes brought the most people in, with how many of those have paid and what they earned. */
export default function TopReferrersCard({ rows, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const most = Math.max(1, ...rows.map((row) => row.joined));

  return (
    <ChartCard
      title={t('loyalty.referrals.topTitle')}
      caption={t('loyalty.referrals.topCaption')}
      hasData={rows.length > 0}
      loading={loading}
      emptyText={t('loyalty.referrals.topEmpty')}
    >
      <List dense disablePadding>
        {rows.map((row, index) => (
          <ListItem key={row.user_id} disableGutters divider={index < rows.length - 1}>
            <Stack spacing={0.75} sx={{ width: '100%', minWidth: 0, py: 0.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                    {`${index + 1}. ${row.name || row.email || row.user_id}`}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                    {t('loyalty.referrals.topLine', {
                      vars: { joined: row.joined, converted: row.converted, coins: coinCount(row.coins) },
                    })}
                  </Typography>
                </Box>
                {row.code && codeChip(row.code)}
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(row.joined / most) * 100}
                aria-label={t('loyalty.referrals.topBar', { vars: { name: row.name || row.code, joined: row.joined } })}
              />
            </Stack>
          </ListItem>
        ))}
      </List>
    </ChartCard>
  );
}
