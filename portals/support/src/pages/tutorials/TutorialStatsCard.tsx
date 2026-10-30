import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Grid, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { TUTORIAL_STATS, type TutorialStatsData } from './queries';

interface Figure {
  id: string;
  label: string;
  value: number;
}

/** Reach at a glance: unique members, total views, likes, comments, and the most-watched list. */
export default function TutorialStatsCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<TutorialStatsData>(TUTORIAL_STATS, { fetchPolicy: 'cache-and-network' });

  if (error) return <Alert severity="error">{t('support.tutorials.statsLoadFailed')}</Alert>;
  const stats = data?.tutorialStats;
  if (!stats) return loading ? <Skeleton variant="rounded" height={120} /> : null;

  const figures: Figure[] = [
    { id: 'viewers', label: t('support.tutorials.statsUniqueViewers'), value: stats.unique_viewers },
    { id: 'views', label: t('support.tutorials.statsTotalViews'), value: stats.total_views },
    { id: 'likes', label: t('support.tutorials.statsLikes'), value: stats.total_likes },
    { id: 'comments', label: t('support.tutorials.statsComments'), value: stats.total_comments },
    { id: 'published', label: t('support.tutorials.statsPublished'), value: stats.published_tutorials },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2}>
          {figures.map((figure) => (
            <Grid key={figure.id} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Typography variant="h5" component="p">
                {figure.value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {figure.label}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Stack spacing={0.5} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" component="h2">
            {t('support.tutorials.statsTitle')}
          </Typography>
          {stats.top_tutorials.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('support.tutorials.statsEmpty')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {stats.top_tutorials.slice(0, 5).map((row) => (
                <ListItem key={row.tutorial_id} disableGutters>
                  <ListItemText
                    primary={row.title}
                    secondary={`${t('support.tutorials.colViews')}: ${row.view_count} · ${t('support.tutorials.colLikes')}: ${row.like_count} · ${t('support.tutorials.colComments')}: ${row.comment_count}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
