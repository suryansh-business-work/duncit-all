import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import DashboardDateRange from './DashboardDateRange';
import DashboardMetricCards, { emptyMetrics } from './DashboardMetricCards';
import DashboardPanels from './DashboardPanels';
import { PARTNER_DASHBOARD } from './dashboard.queries';
import type { DashboardRange, DashboardTab } from './dashboard.types';

const tabs: Array<{ value: DashboardTab; label: string }> = [
  { value: 'venue', label: 'Venue' },
  { value: 'host', label: 'Host' },
  { value: 'products', label: 'Products' },
];

const initialRange = (): DashboardRange => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) });

export default function PartnerDashboardPage() {
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const [tab, setTab] = useState<DashboardTab>('venue');
  const { data, loading, error } = useQuery(PARTNER_DASHBOARD, {
    variables: { from: range.from.toISOString(), to: range.to.toISOString() },
    fetchPolicy: 'cache-and-network',
  });
  const dashboard = data?.partnerDashboard;
  const roles = data?.me?.roles ?? [];
  const venues = data?.myVenues ?? [];
  const pods = data?.myHostPods ?? [];
  const products = data?.myProductListings ?? [];
  const itemCounts: Record<DashboardTab, number> = { venue: venues.length, host: pods.length, products: products.length };
  const roleAccess: Record<DashboardTab, boolean> = {
    venue: roles.includes('VENUE_OWNER') || venues.length > 0,
    host: roles.includes('HOST') || pods.length > 0,
    products: roles.includes('ECOMM_MANAGER') || products.length > 0,
  };
  const hasItems = itemCounts[tab] > 0;
  const metrics = dashboard?.[tab] ?? emptyMetrics;

  return (
    <Stack spacing={2.25}>
      <Box sx={{ p: 2.25, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Duncit Partners</Typography>
            <Typography variant="h4" fontWeight={950}>Dashboard</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>{format(range.from, 'dd MMM yyyy')} - {format(range.to, 'dd MMM yyyy')}</Typography>
          </Box>
          <DashboardDateRange range={range} onChange={setRange} />
        </Stack>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
              <Box>
                <Typography variant="h6" fontWeight={950}>Partner performance</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={800}>Summary total: {formatMoney(dashboard?.summary?.total_earning ?? 0)}</Typography>
              </Box>
              {loading && <CircularProgress size={22} />}
            </Stack>
            <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
              {tabs.map((item) => <Tab key={item.value} value={item.value} label={`${item.label}${itemCounts[item.value] ? ` (${itemCounts[item.value]})` : ''}`} />)}
            </Tabs>
            {hasItems && <DashboardMetricCards metrics={metrics} />}
            <DashboardPanels tab={tab} venues={venues} pods={pods} products={products} hasRoleAccess={roleAccess[tab]} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}