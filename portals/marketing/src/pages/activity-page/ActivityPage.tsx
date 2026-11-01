import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { LinearProgress, Stack } from '@mui/material';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import type { Translate } from './runFormat';
import { pinnedFilters } from './runFilters';
import RunsGuide from './RunsGuide';
import RunsBoard from './RunsBoard';

const TOUR_ID = 'marketing.activity';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'runs-table', title: t('marketing.activity.tourTableTitle'), body: t('marketing.activity.tourTableBody') },
  { anchor: 'runs-status', title: t('marketing.activity.tourStatusTitle'), body: t('marketing.activity.tourStatusBody') },
  { anchor: 'runs-details', title: t('marketing.activity.tourDetailsTitle'), body: t('marketing.activity.tourDetailsBody') },
];

/**
 * Marketing → Activity: every automation and agent run, newest first. The
 * URL can pin the list — `?status=FAILED`, `?workflow=REEL`, `?mine=1` — which
 * is how the cards on My Tasks and the dashboard land here.
 */
export default function ActivityPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { user } = useUserData();
  const userId = user?.user_id ?? null;
  const pins = useMemo(() => pinnedFilters(params, userId), [params, userId]);

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="activity-page">
      <PageHeader title={t('marketing.activity.title')} subtitle={t('marketing.activity.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.activity.introSummary')}
        steps={[t('marketing.activity.introStep1'), t('marketing.activity.introStep2'), t('marketing.activity.introStep3')]}
        tour={tourSteps(t)}
      />
      {pins ? (
        <RunsBoard extraFilters={pins} emptyText={t('marketing.activity.empty')} />
      ) : (
        // "Mine" was asked for before the signed-in person is known: wait, rather than list everyone's.
        <LinearProgress data-testid="activity-waiting" />
      )}
    </Stack>
  );
}
