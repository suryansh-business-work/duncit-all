import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Card, CardActionArea, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { GIG_JOB_STATS } from '../../queries';
import type { GigJobStats } from '../../types';

interface Tile {
  key: keyof GigJobStats;
  label: string;
  to: string;
}

/** The console's home: the numbers that say how Gig Jobs is doing, each opening its table. */
export default function GigDashboardPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ gigJobStats: GigJobStats }>(GIG_JOB_STATS, {
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.gigJobStats;
  const tiles: Tile[] = [
    { key: 'open', label: t('gigJobs.console.statOpen'), to: '/gigs' },
    { key: 'closed', label: t('gigJobs.console.statClosed'), to: '/gigs' },
    { key: 'total', label: t('gigJobs.console.statTotal'), to: '/gigs' },
    { key: 'interests', label: t('gigJobs.console.statInterests'), to: '/interests' },
    { key: 'freelancers', label: t('gigJobs.console.statFreelancers'), to: '/freelancers' },
    { key: 'posters', label: t('gigJobs.console.statPosters'), to: '/gigs' },
    { key: 'categories', label: t('gigJobs.console.statCategories'), to: '/categories' },
  ];

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.console.dashboardTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.console.dashboardSubtitle')}
        </Typography>
      </Stack>
      {error && !stats ? <Alert severity="error">{t('gigJobs.console.loadFailed')}</Alert> : null}
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid key={tile.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardActionArea component={RouterLink} to={tile.to}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {tile.label}
                  </Typography>
                  {loading && !stats ? (
                    <Skeleton variant="text" width={64} height={40} />
                  ) : (
                    <Typography variant="h4" component="p">
                      {stats?.[tile.key] ?? 0}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
