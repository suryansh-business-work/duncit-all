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
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BadgeIcon from '@mui/icons-material/Badge';
import type { SvgIconComponent } from '@mui/icons-material';
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
  icon: SvgIconComponent;
  color: string;
}> = [
  { key: 'users_total', label: 'Users', icon: PeopleAltIcon, color: '#2563eb' },
  { key: 'pods_total', label: 'Pods', icon: EventAvailableIcon, color: '#7c3aed' },
  { key: 'clubs_total', label: 'Clubs', icon: GroupsIcon, color: '#0f766e' },
  { key: 'venues_total', label: 'Venues', icon: StorefrontIcon, color: '#d97706' },
  { key: 'hosts_total', label: 'Hosts', icon: BadgeIcon, color: '#dc2626' },
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
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor users, pods, clubs and live activity from one workspace.
          </Typography>
        </Box>
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
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {t.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {totalsLoading ? '…' : totals?.[t.key] ?? 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: `${t.color}1A`,
                      color: t.color,
                    }}
                  >
                    <t.icon fontSize="small" />
                  </Box>
                </Stack>
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
