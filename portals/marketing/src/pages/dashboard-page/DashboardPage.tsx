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
import { useDateFormat } from '@duncit/app-settings';
import { formatINR, parseApiError } from '@duncit/utils';
import ClicksOverTime from '../short-links-page/detail/ClicksOverTime';
import BreakdownCard from '../short-links-page/detail/BreakdownCard';
import KpiCard from './KpiCard';
import TopLinksCard from './TopLinksCard';
import CampaignPerformanceCard from './CampaignPerformanceCard';
import { MARKETING_DASHBOARD, type MarketingDashboard } from './queries';

const header = (subtitle: string) => <PageHeader title="Dashboard" subtitle={subtitle} />;

/** What marketing did, and what it earned. */
export default function DashboardPage() {
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
          label="Link clicks"
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
          label="Revenue from links"
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
          label="Emails delivered"
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
          label="Live ads"
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
            title="Where clicks came from"
            rows={links.platforms}
            emptyText="No clicks recorded yet."
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
          <BreakdownCard title="Countries" rows={links.countries} emptyText="No clicks recorded yet." />
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
            title="What is set up"
            rows={[
              { label: 'Active short links', count: links.active },
              { label: 'Short links in total', count: links.total },
              { label: 'Saved audience lists', count: audience.lists },
              { label: 'Campaigns scheduled', count: campaigns.scheduled },
              { label: 'Campaigns failed', count: campaigns.failed },
            ]}
            emptyText="Nothing set up yet."
          />
        ),
      },
    ];
  }, [board, go, navigate, formatDate, formatDateTime]);

  if (error) {
    return (
      <Stack spacing={2}>
        {header('Marketing at a glance')}
        <Alert severity="error">{parseApiError(error, 'Could not load the dashboard')}</Alert>
      </Stack>
    );
  }

  if (!board) {
    return (
      <Stack spacing={2}>
        {header('Marketing at a glance')}
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  return (
    <Box>
      <DuncitDashboard
        dashboardId="marketing.overview"
        header={header(`Marketing at a glance · last ${board.days} days`)}
        widgets={widgets}
      />
    </Box>
  );
}
