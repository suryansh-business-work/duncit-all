import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import CountsBySuperCategoryGrid from './dashboard/CountsBySuperCategoryGrid';
import SummaryTiles from './dashboard/SummaryTiles';
import { SUPER_CATS, TOTALS } from './dashboard/queries';

/** "Total 128" — the count that used to sit in each chart card's own header. */
function TotalChip({ total }: Readonly<{ total: number }>) {
  return (
    <Typography variant="overline" color="text.secondary">
      Total {total}
    </Typography>
  );
}

export default function DashboardPage() {
  const [superSlug, setSuperSlug] = useState('');

  const { data: catsData } = useQuery(SUPER_CATS);
  const { data: totalsData, loading: totalsLoading } = useQuery(TOTALS, {
    variables: { slug: superSlug || null },
    fetchPolicy: 'cache-and-network',
  });

  const totals = totalsData?.dashboardTotals;

  const widgets = useMemo<DashboardWidget[]>(
    () => [
      {
        id: 'summary-tiles',
        bare: true,
        defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
        minH: 2,
        content: <SummaryTiles totals={totals} loading={totalsLoading} />,
      },
      {
        id: 'pods-by-super-category',
        title: 'Pods by super category',
        headerActions: <TotalChip total={totals?.pods_total ?? 0} />,
        defaultLayout: { x: 0, y: 2, w: 12, h: 5 },
        minW: 4,
        minH: 4,
        content: <CountsBySuperCategoryGrid counts={totals?.pods ?? []} color="#FF4D4F" />,
      },
      {
        id: 'clubs-by-super-category',
        title: 'Clubs by super category',
        headerActions: <TotalChip total={totals?.clubs_total ?? 0} />,
        defaultLayout: { x: 0, y: 7, w: 12, h: 5 },
        minW: 4,
        minH: 4,
        content: <CountsBySuperCategoryGrid counts={totals?.clubs ?? []} color="#3b82f6" />,
      },
    ],
    [totals, totalsLoading],
  );

  return (
    <DuncitDashboard
      dashboardId="admin.overview"
      header={
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
          {/* Page-level filter: it drives every widget, so it stays in the
              header rather than becoming a draggable widget of its own. */}
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
      }
      widgets={widgets}
    />
  );
}
