import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { PageHeader, SectionCard, type PortalTourStep } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '../activity-page/runFormat';
import { AWAITING_APPROVAL_FILTERS } from '../activity-page/runFilters';
import RunsGuide from '../activity-page/RunsGuide';
import RunsBoard from '../activity-page/RunsBoard';
import RunSummaryCards, { type RunSummaryCard } from '../activity-page/RunSummaryCards';

const TOUR_ID = 'marketing.approvals';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'runs-table', title: t('marketing.approvals.tourTableTitle'), body: t('marketing.approvals.tourTableBody') },
  { anchor: 'runs-status', title: t('marketing.approvals.tourStatusTitle'), body: t('marketing.approvals.tourStatusBody') },
  { anchor: 'runs-details', title: t('marketing.approvals.tourDetailsTitle'), body: t('marketing.approvals.tourDetailsBody') },
];

/**
 * Marketing → Approvals: the runs waiting for a person to say yes, with the
 * week's numbers above them. Ads keep their own review queue, so this page
 * only points at it.
 */
export default function ApprovalsPage() {
  const { t } = useTranslation();
  const cards = useMemo<RunSummaryCard[]>(
    () => [
      { key: 'awaiting', label: t('marketing.approvals.cardAwaiting'), value: (summary) => summary.awaiting_approval },
      { key: 'running', label: t('marketing.approvals.cardRunning'), value: (summary) => summary.running },
      {
        key: 'failed',
        label: t('marketing.approvals.cardFailed'),
        value: (summary) => summary.failed_7d,
        to: '/activity?status=FAILED',
      },
    ],
    [t],
  );

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="approvals-page">
      <PageHeader title={t('marketing.approvals.title')} subtitle={t('marketing.approvals.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.approvals.introSummary')}
        steps={[t('marketing.approvals.introStep1'), t('marketing.approvals.introStep2'), t('marketing.approvals.introStep3')]}
        tour={tourSteps(t)}
      />
      <RunSummaryCards cards={cards} />
      <SectionCard title={t('marketing.approvals.adsTitle')} icon={<CampaignOutlinedIcon color="action" />}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.approvals.adsBody')}{' '}
          <Link component={RouterLink} to="/ads-approvals" data-testid="ads-approvals-link">
            {t('marketing.approvals.adsLink')}
          </Link>
        </Typography>
      </SectionCard>
      <RunsBoard tableId="marketing-approvals" extraFilters={AWAITING_APPROVAL_FILTERS} emptyText={t('marketing.approvals.empty')} />
    </Stack>
  );
}
