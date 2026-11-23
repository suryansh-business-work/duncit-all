import { Link as RouterLink } from 'react-router';
import { List, ListItem, ListItemText, Typography } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import { EmptyState, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { formatMonthKey } from '@duncit/utils';
import type { DashboardQueueRow } from '../../lib/dashboard-queries';

type Props = Readonly<{ rows: DashboardQueueRow[]; total: number }>;

/** The reports that have waited longest for a review, with the way to the screen that reviews them. */
export default function ReviewQueueCard({ rows, total }: Props) {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const open = (
    <DuncitButton component={RouterLink} to="/employee-targets" size="small" data-testid="targets-queue-open">
      {t('targets.dashboard.queue.open')}
    </DuncitButton>
  );

  return (
    <SectionCard
      title={t('targets.dashboard.queue.title')}
      subtitle={t('targets.dashboard.queue.subtitle')}
      icon={<RateReviewIcon />}
      action={rows.length > 0 ? open : undefined}
    >
      {rows.length === 0 ? (
        <EmptyState compact title={t('targets.dashboard.queue.empty')} data-testid="targets-queue-empty" />
      ) : (
        <List dense disablePadding aria-label={t('targets.dashboard.queue.title')} data-testid="targets-queue">
          {rows.map((row) => (
            <ListItem key={row.id} divider={rows.length > 1} disableGutters data-testid="targets-queue-row">
              <ListItemText
                primary={row.employee.name}
                secondary={t('targets.dashboard.queue.submitted', {
                  vars: {
                    month: formatMonthKey(row.month, locale),
                    date: row.submission ? formatDateTime(row.submission.submitted_at) : '',
                  },
                })}
              />
              {row.submission ? (
                <Typography variant="body2" sx={{ fontWeight: 700, pl: 2 }}>
                  {t('employeeTargets.submission.percent', { vars: { percent: row.submission.completion_percent } })}
                </Typography>
              ) : null}
            </ListItem>
          ))}
        </List>
      )}
      {total > rows.length ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          {t('targets.dashboard.ofTotal', { vars: { count: rows.length, total } })}
        </Typography>
      ) : null}
    </SectionCard>
  );
}
