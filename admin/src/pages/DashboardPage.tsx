import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CountsBySuperCategoryGrid from './dashboard/CountsBySuperCategoryGrid';
import RangePicker, { type Granularity } from './dashboard/RangePicker';
import ActiveUsersChart from './dashboard/ActiveUsersChart';

const SUPER_CATS = gql`
  query DashboardSuperCats {
    categories(filter: { level: SUPER }) {
      id
      name
      slug
    }
  }
`;

const TOTALS = gql`
  query DashboardTotals($slug: String) {
    dashboardTotals(super_category_slug: $slug) {
      pods {
        super_category_slug
        super_category_name
        count
      }
      clubs {
        super_category_slug
        super_category_name
        count
      }
      users_total
      pods_total
      clubs_total
      venues_total
      hosts_total
    }
  }
`;

const ACTIVE = gql`
  query DashboardActive(
    $from: String!
    $to: String!
    $granularity: AnalyticsGranularity
    $slug: String
  ) {
    activeUserStats(from: $from, to: $to, granularity: $granularity, super_category_slug: $slug) {
      granularity
      from
      to
      total_unique_devices
      total_unique_users
      buckets {
        bucket
        unique_devices
        unique_users
      }
    }
  }
`;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const SUMMARY_TILES: Array<{
  key: 'users_total' | 'pods_total' | 'clubs_total' | 'venues_total' | 'hosts_total';
  label: string;
}> = [
  { key: 'users_total', label: 'Users' },
  { key: 'pods_total', label: 'Pods' },
  { key: 'clubs_total', label: 'Clubs' },
  { key: 'venues_total', label: 'Venues' },
  { key: 'hosts_total', label: 'Hosts' },
];

export default function DashboardPage() {
  const [superSlug, setSuperSlug] = useState('');
  const initialFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return ymd(d);
  }, []);
  const [from, setFrom] = useState<string>(initialFrom);
  const [to, setTo] = useState<string>(ymd(new Date()));
  const [granularity, setGranularity] = useState<Granularity>('DAY');

  const { data: catsData } = useQuery(SUPER_CATS);
  const { data: totalsData, loading: totalsLoading } = useQuery(TOTALS, {
    variables: { slug: superSlug || null },
    fetchPolicy: 'cache-and-network',
  });
  const { data: activeData, loading: activeLoading } = useQuery(ACTIVE, {
    variables: { from, to, granularity, slug: superSlug || null },
    fetchPolicy: 'cache-and-network',
  });

  const totals = totalsData?.dashboardTotals;
  const active = activeData?.activeUserStats;

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Dashboard
        </Typography>
        <TextField
          select
          size="small"
          label="Super Category"
          value={superSlug}
          onChange={(e) => setSuperSlug(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All super categories</MenuItem>
          {(catsData?.categories ?? []).map((c: any) => (
            <MenuItem key={c.slug} value={c.slug}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Grid container spacing={2}>
        {SUMMARY_TILES.map((t) => (
          <Grid item xs={6} sm={4} md={2.4} key={t.key}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {totalsLoading ? '…' : totals?.[t.key] ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <CountsBySuperCategoryGrid
        title="Pods by super category"
        counts={totals?.pods ?? []}
        total={totals?.pods_total ?? 0}
        color="#FF4D4F"
      />
      <CountsBySuperCategoryGrid
        title="Clubs by super category"
        counts={totals?.clubs ?? []}
        total={totals?.clubs_total ?? 0}
        color="#3b82f6"
      />

      <Card>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Active users (by device)
            </Typography>
            <Typography variant="overline" color="text.secondary">
              {active
                ? `${active.total_unique_devices} devices · ${active.total_unique_users} users`
                : ''}
            </Typography>
          </Stack>
          <RangePicker
            from={from}
            to={to}
            granularity={granularity}
            onFromChange={setFrom}
            onToChange={setTo}
            onGranularityChange={setGranularity}
          />
          {activeLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {!activeLoading && <ActiveUsersChart buckets={active?.buckets ?? []} />}
        </CardContent>
      </Card>
    </Stack>
  );
}
