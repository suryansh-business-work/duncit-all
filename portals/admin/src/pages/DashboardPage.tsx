import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CountsBySuperCategoryGrid from './dashboard/CountsBySuperCategoryGrid';
import SummaryTiles from './dashboard/SummaryTiles';
import { SUPER_CATS, TOTALS } from './dashboard/queries';

export default function DashboardPage() {
  const [superSlug, setSuperSlug] = useState('');

  const { data: catsData } = useQuery(SUPER_CATS);
  const { data: totalsData, loading: totalsLoading } = useQuery(TOTALS, {
    variables: { slug: superSlug || null },
    fetchPolicy: 'cache-and-network',
  });

  const totals = totalsData?.dashboardTotals;

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

      <SummaryTiles totals={totals} loading={totalsLoading} />

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
    </Stack>
  );
}
