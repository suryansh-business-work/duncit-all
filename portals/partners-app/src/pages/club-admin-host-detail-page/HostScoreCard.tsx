import { Card, CardContent, LinearProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { ClubHostDetail } from './queries';

/**
 * This month's Host Performance Score so far, the facts behind it, and the
 * finished months the monthly job has snapshotted (oldest first).
 */
export default function HostScoreCard({ host }: Readonly<{ host: ClubHostDetail }>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" data-testid="club-host-score">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
            {t('clubAdmin.hosts.scoreTitle')}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" component="p" sx={{ fontWeight: 900 }}>
              {t('clubAdmin.hosts.scorePercent', { vars: { score: host.score } })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={host.score}
              color={host.score >= 100 ? 'success' : 'warning'}
              sx={{ flex: 1 }}
              aria-label={t('clubAdmin.hosts.scoreAria', { vars: { score: host.score } })}
            />
          </Stack>
          <Typography variant="body2">
            {t('clubAdmin.hosts.scoreCaption', {
              vars: { done: host.completed_this_month, target: host.monthly_target },
            })}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('clubAdmin.hosts.scoreHint')}
          </Typography>
          <Typography variant="body2">
            {t('clubAdmin.hosts.lastPodLine', {
              vars: { date: formatDate(host.last_pod_at) || t('clubAdmin.hosts.noPodYet') },
            })}
          </Typography>
          <Typography variant="body2">
            {t('clubAdmin.hosts.upcomingLine', { vars: { count: host.upcoming_count } })}
          </Typography>
          <Typography variant="subtitle2" component="h3">
            {t('clubAdmin.hosts.historyTitle')}
          </Typography>
          {host.score_history.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('clubAdmin.hosts.historyEmpty')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {host.score_history.map((point) => (
                <ListItem key={point.period} disableGutters data-testid={`club-host-history-${point.period}`}>
                  <ListItemText
                    primary={`${point.period} · ${t('clubAdmin.hosts.scorePercent', { vars: { score: point.score } })}`}
                    secondary={t('clubAdmin.hosts.historyRow', { vars: { done: point.completed, target: point.target } })}
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
