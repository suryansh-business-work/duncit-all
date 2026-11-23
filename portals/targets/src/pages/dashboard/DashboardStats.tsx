import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, CardActionArea } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RateReviewIcon from '@mui/icons-material/RateReview';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InsightsIcon from '@mui/icons-material/Insights';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { DashboardData } from '../../lib/dashboard-queries';
import { formatTarget } from '../../lib/growth-format';

interface Tile {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  to: string;
}

/**
 * The headline numbers, one tile each, every tile opening the screen where
 * the number can be acted on.
 */
export default function DashboardStats({ board }: Readonly<{ board: DashboardData }>) {
  const { t } = useTranslation();
  const month = board.current_month;
  const reported = month.submitted + month.reviewed;
  const average = month.average_completion;

  const tiles: Tile[] = [
    {
      id: 'targets-set',
      label: t('targets.dashboard.stat.targetsSet'),
      value: formatTarget(month.total),
      hint: t('targets.dashboard.stat.activeEmployees', { vars: { count: formatTarget(board.active_employees) } }),
      icon: <FlagIcon />,
      to: '/employee-targets',
    },
    {
      id: 'reported',
      label: t('targets.dashboard.stat.reported'),
      value: t('targets.dashboard.ofTotal', { vars: { count: formatTarget(reported), total: formatTarget(month.total) } }),
      hint:
        average === null || average === undefined
          ? t('targets.dashboard.stat.noReports')
          : t('targets.dashboard.stat.averageCompletion', { vars: { percent: average } }),
      icon: <AssignmentTurnedInIcon />,
      to: '/employee-targets',
    },
    {
      id: 'awaiting-review',
      label: t('targets.dashboard.stat.awaitingReview'),
      value: formatTarget(board.awaiting_review),
      hint: t('targets.dashboard.stat.acrossMonths'),
      icon: <RateReviewIcon />,
      to: '/employee-targets',
    },
    {
      id: 'reminders-due',
      label: t('targets.dashboard.stat.remindersDue'),
      value: formatTarget(board.reminders_due),
      hint: t('targets.dashboard.stat.remindersHint'),
      icon: <NotificationsActiveIcon />,
      to: '/employee-targets',
    },
    {
      id: 'saved-plans',
      label: t('targets.dashboard.stat.savedPlans'),
      value: formatTarget(board.saved_calculations),
      hint: t('targets.dashboard.stat.savedPlansHint'),
      icon: <InsightsIcon />,
      to: '/growth-calculator',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
      {tiles.map((tile) => (
        <CardActionArea
          key={tile.id}
          component={RouterLink}
          to={tile.to}
          data-testid={`targets-stat-${tile.id}`}
          sx={{ borderRadius: 1, height: '100%' }}
        >
          <StatCard label={tile.label} value={tile.value} hint={tile.hint} icon={tile.icon} valueVariant="h5" />
        </CardActionArea>
      ))}
    </Box>
  );
}
