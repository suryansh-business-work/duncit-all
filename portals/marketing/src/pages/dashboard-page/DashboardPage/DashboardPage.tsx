import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ClicksOverTime from '../../short-links-page/detail/ClicksOverTime';
import BreakdownCard from '../../short-links-page/detail/BreakdownCard';
import TopLinksCard from '../TopLinksCard';
import CampaignPerformanceCard from '../CampaignPerformanceCard';
import { MARKETING_DASHBOARD, type MarketingDashboard } from '../queries';
import { buildKpiWidgets } from './kpiWidgets';

type Translate = ReturnType<typeof useTranslation>['t'];

const header = (subtitle: string, t: Translate) => (
  <PageHeader title={t('shell.nav.dashboard')} subtitle={subtitle} />
);

/** What marketing did, and what it earned. */
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate, formatDateTime } = useDateFormat();
  const { data, error } = useQuery<{ marketingDashboard: MarketingDashboard }>(
    MARKETING_DASHBOARD,
    { fetchPolicy: 'cache-and-network' },
  );

  const go = useCallback((path: string) => () => navigate(path), [navigate]);
  const board = data?.marketingDashboard;

  const widgets = useMemo<DashboardWidget[]>(() => {
    if (!board) return [];
    const { links, campaigns, audience } = board;

    return [
      ...buildKpiWidgets({ board, t, go }),
      {
        id: 'clicks-over-time',
        bare: true,
        // Fixed-height plot in a non-stretching card — h5 leaves a void.
        fitContent: true,
        defaultLayout: { x: 0, y: 2, w: 12, h: 5 },
        minW: 4,
        minH: 4,
        content: <ClicksOverTime daily={links.daily} formatDate={formatDate} days={board.days} />,
      },
      {
        id: 'top-links',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 0, y: 7, w: 6, h: 6 },
        minW: 3,
        // minH floors the measured height — keep it low or empty states pin a void.
        minH: 2,
        content: <TopLinksCard links={links.top} onOpen={(link) => navigate(`/short-links/${link.id}`)} />,
      },
      {
        id: 'campaign-performance',
        bare: true,
        fitContent: true,
        defaultLayout: { x: 6, y: 7, w: 6, h: 6 },
        minW: 3,
        minH: 2,
        content: (
          <CampaignPerformanceCard
            campaigns={campaigns.recent}
            formatDate={formatDateTime}
            onOpen={go('/campaigns/email')}
          />
        ),
      },
      {
        id: 'click-sources',
        bare: true,
        defaultLayout: { x: 0, y: 13, w: 4, h: 5 },
        minW: 3,
        minH: 3,
        content: (
          <BreakdownCard
            title={t('marketing.dashboard.whereClicksCameFrom')}
            rows={links.platforms}
            emptyText={t('marketing.dashboard.noClicksRecordedYet')}
          />
        ),
      },
      {
        id: 'click-countries',
        bare: true,
        defaultLayout: { x: 4, y: 13, w: 4, h: 5 },
        minW: 3,
        minH: 3,
        content: (
          <BreakdownCard title={t('marketing.common.countries')} rows={links.countries} emptyText={t('marketing.dashboard.noClicksRecordedYet')} />
        ),
      },
      {
        id: 'setup-summary',
        bare: true,
        defaultLayout: { x: 8, y: 13, w: 4, h: 5 },
        minW: 3,
        minH: 3,
        content: (
          <BreakdownCard
            title={t('marketing.dashboard.whatIsSetUp')}
            rows={[
              { label: t('marketing.dashboard.activeShortLinks'), count: links.active },
              { label: t('marketing.dashboard.shortLinksInTotal'), count: links.total },
              { label: t('marketing.dashboard.savedAudienceLists'), count: audience.lists },
              { label: t('marketing.dashboard.campaignsScheduled'), count: campaigns.scheduled },
              { label: t('marketing.dashboard.campaignsFailed'), count: campaigns.failed },
            ]}
            emptyText={t('marketing.dashboard.nothingSetUpYet')}
          />
        ),
      },
    ];
  }, [board, go, navigate, formatDate, formatDateTime]);

  if (error) {
    return (
      <Stack spacing={2}>
        {header(t('marketing.dashboard.atAGlance'), t)}
        <Alert severity="error">{parseApiError(error, 'Could not load the dashboard')}</Alert>
      </Stack>
    );
  }

  if (!board) {
    return (
      <Stack spacing={2}>
        {header(t('marketing.dashboard.atAGlance'), t)}
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  return (
    <Box>
      <DuncitDashboard
        dashboardId="marketing.overview"
        header={header(t('marketing.dashboard.atAGlanceDays', { vars: { days: board.days } }), t)}
        widgets={widgets}
      />
    </Box>
  );
}
