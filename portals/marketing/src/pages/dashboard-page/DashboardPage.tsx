import { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import CampaignIcon from '@mui/icons-material/Campaign';
import { PageHeader } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { formatINR, parseApiError } from '@duncit/utils';
import ClicksOverTime from '../short-links-page/detail/ClicksOverTime';
import BreakdownCard from '../short-links-page/detail/BreakdownCard';
import KpiCard from './KpiCard';
import TopLinksCard from './TopLinksCard';
import CampaignPerformanceCard from './CampaignPerformanceCard';
import { MARKETING_DASHBOARD, type MarketingDashboard } from './queries';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
} as const;

const HALVES = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
} as const;

const THIRDS = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
} as const;

/** What marketing did, and what it earned. */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { formatDate, formatDateTime } = useDateFormat();
  const { data, error } = useQuery<{ marketingDashboard: MarketingDashboard }>(
    MARKETING_DASHBOARD,
    { fetchPolicy: 'cache-and-network' },
  );

  const go = useCallback((path: string) => () => navigate(path), [navigate]);

  if (error) {
    return (
      <Stack spacing={2}>
        <PageHeader title="Dashboard" subtitle="Marketing at a glance" />
        <Alert severity="error">{parseApiError(error, 'Could not load the dashboard')}</Alert>
      </Stack>
    );
  }

  const board = data?.marketingDashboard;

  if (!board) {
    return (
      <Stack spacing={2}>
        <PageHeader title="Dashboard" subtitle="Marketing at a glance" />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  const { links, campaigns, audience, ads } = board;
  const window = `Last ${board.days} days`;

  return (
    <Stack spacing={2}>
      <PageHeader title="Dashboard" subtitle={`Marketing at a glance · ${window.toLowerCase()}`} />

      <Box sx={GRID}>
        <KpiCard
          label="Link clicks"
          value={links.total_clicks.toLocaleString()}
          hint={`${links.unique_visitors.toLocaleString()} unique visitors`}
          icon={<LinkIcon />}
          onOpen={go('/short-links')}
        />
        <KpiCard
          label="Revenue from links"
          value={formatINR(links.revenue)}
          hint={`${links.conversions.toLocaleString()} paid · ${links.conversion_rate}% of clicks`}
          icon={<PaymentsIcon />}
          onOpen={go('/short-links')}
        />
        <KpiCard
          label="Emails delivered"
          value={campaigns.recipients.toLocaleString()}
          hint={`${campaigns.sent} campaigns · ${campaigns.open_rate}% opened`}
          icon={<EmailIcon />}
          onOpen={go('/campaigns/email')}
        />
        <KpiCard
          label="Live ads"
          value={ads.live.toLocaleString()}
          hint={
            ads.pending > 0 ? `${ads.pending} waiting for approval` : 'Nothing waiting for approval'
          }
          icon={<CampaignIcon />}
          onOpen={go(ads.pending > 0 ? '/ads-approvals' : '/live-ads')}
        />
      </Box>

      <ClicksOverTime daily={links.daily} formatDate={formatDate} days={board.days} />

      <Box sx={HALVES}>
        <TopLinksCard links={links.top} onOpen={(link) => navigate(`/short-links/${link.id}`)} />
        <CampaignPerformanceCard
          campaigns={campaigns.recent}
          formatDate={formatDateTime}
          onOpen={go('/campaigns/email')}
        />
      </Box>

      <Box sx={THIRDS}>
        <BreakdownCard
          title="Where clicks came from"
          rows={links.platforms}
          emptyText="No clicks recorded yet."
        />
        <BreakdownCard
          title="Countries"
          rows={links.countries}
          emptyText="No clicks recorded yet."
        />
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
      </Box>
    </Stack>
  );
}
