import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import CampaignIcon from '@mui/icons-material/Campaign';
import { PageHeader } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { formatINR, parseApiError } from '@duncit/utils';
import ClicksOverTime from '../short-links-page/detail/ClicksOverTime';
import BreakdownCard from '../short-links-page/detail/BreakdownCard';
import KpiCard from './KpiCard';
import TopLinksCard from './TopLinksCard';
import CampaignPerformanceCard from './CampaignPerformanceCard';
import { MARKETING_DASHBOARD, type MarketingDashboard } from './queries';

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
    const { links, campaigns, audience, ads } = board;
    // The four KPIs are separate widgets so the one this team actually watches
    // can be dragged to the front; the cards below already own their surface.
    const kpi = (
      id: string,
      x: number,
      content: DashboardWidget['content'],
    ): DashboardWidget => ({
      id,
      bare: true,
      defaultLayout: { x, y: 0, w: 3, h: 2 },
      minW: 2,
      minH: 2,
      content,
    });

    return [
      kpi(
        'kpi-clicks',
        0,
        <KpiCard
          label={t('marketing.dashboard.linkClicks')}
          value={links.total_clicks.toLocaleString()}
          hint={`${links.unique_visitors.toLocaleString()} unique visitors`}
          icon={<LinkIcon />}
          onOpen={go('/short-links')}
        />,
      ),
      kpi(
        'kpi-revenue',
        3,
        <KpiCard
          label={t('marketing.dashboard.revenueFromLinks')}
          value={formatINR(links.revenue)}
          hint={`${links.conversions.toLocaleString()} paid · ${links.conversion_rate}% of clicks`}
          icon={<PaymentsIcon />}
          onOpen={go('/short-links')}
        />,
      ),
      kpi(
        'kpi-emails',
        6,
        <KpiCard
          label={t('marketing.dashboard.emailsDelivered')}
          value={campaigns.recipients.toLocaleString()}
          hint={`${campaigns.sent} campaigns · ${campaigns.open_rate}% opened`}
          icon={<EmailIcon />}
          onOpen={go('/campaigns/email')}
        />,
      ),
      kpi(
        'kpi-ads',
        9,
        <KpiCard
          label={t('marketing.dashboard.liveAds')}
          value={ads.live.toLocaleString()}
          hint={ads.pending > 0 ? `${ads.pending} waiting for approval` : 'Nothing waiting for approval'}
          icon={<CampaignIcon />}
          onOpen={go(ads.pending > 0 ? '/ads-approvals' : '/live-ads')}
        />,
      ),
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
