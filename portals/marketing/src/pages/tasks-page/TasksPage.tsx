import { useMemo } from 'react';
import { LinearProgress, Stack } from '@mui/material';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import type { Translate } from '../activity-page/runFormat';
import { openRunFilters } from '../activity-page/runFilters';
import RunsGuide from '../activity-page/RunsGuide';
import RunsBoard from '../activity-page/RunsBoard';
import RunSummaryCards, { type RunSummaryCard } from '../activity-page/RunSummaryCards';

const TOUR_ID = 'marketing.tasks';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'runs-table', title: t('marketing.tasks.tourTableTitle'), body: t('marketing.tasks.tourTableBody') },
  { anchor: 'runs-status', title: t('marketing.tasks.tourStatusTitle'), body: t('marketing.tasks.tourStatusBody') },
  { anchor: 'runs-details', title: t('marketing.tasks.tourDetailsTitle'), body: t('marketing.tasks.tourDetailsBody') },
];

/**
 * Marketing → My Tasks: what is waiting on the signed-in person, and their
 * own runs that have not finished. Each card leads to the list it counts.
 */
export default function TasksPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const userId = user?.user_id ?? null;
  const cards = useMemo<RunSummaryCard[]>(
    () => [
      { key: 'approvals', label: t('marketing.tasks.cardApprovals'), value: (summary) => summary.awaiting_approval, to: '/approvals' },
      { key: 'mine', label: t('marketing.tasks.cardMine'), value: (summary) => summary.mine_open, to: '/activity?mine=1' },
      { key: 'failed', label: t('marketing.tasks.cardFailed'), value: (summary) => summary.failed_7d, to: '/activity?status=FAILED' },
    ],
    [t],
  );
  const pins = useMemo(() => (userId ? openRunFilters(userId) : null), [userId]);

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="tasks-page">
      <PageHeader title={t('marketing.tasks.title')} subtitle={t('marketing.tasks.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.tasks.introSummary')}
        steps={[t('marketing.tasks.introStep1'), t('marketing.tasks.introStep2'), t('marketing.tasks.introStep3')]}
        tour={tourSteps(t)}
      />
      <RunSummaryCards cards={cards} />
      {pins ? (
        <RunsBoard tableId="marketing-tasks" extraFilters={pins} emptyText={t('marketing.tasks.empty')} />
      ) : (
        // The list is the signed-in person's own runs; until they are known there is nothing honest to show.
        <LinearProgress data-testid="tasks-waiting" />
      )}
    </Stack>
  );
}
