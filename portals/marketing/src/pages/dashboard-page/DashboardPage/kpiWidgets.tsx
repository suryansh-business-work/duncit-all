import LinkIcon from '@mui/icons-material/Link';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import CampaignIcon from '@mui/icons-material/Campaign';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/app-settings';
import { formatINR } from '@duncit/utils';
import KpiCard from '../KpiCard';
import type { MarketingDashboard } from '../queries';

interface KpiDeps {
  board: MarketingDashboard;
  t: ReturnType<typeof useTranslation>['t'];
  go: (path: string) => () => void;
}

/** The four headline KPI widgets, one per tile so each can be dragged on its own. */
export function buildKpiWidgets({ board, t, go }: Readonly<KpiDeps>): DashboardWidget[] {
  const { links, campaigns, ads } = board;
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
  ];
}
