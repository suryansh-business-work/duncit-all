import LinkIcon from '@mui/icons-material/Link';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import CampaignIcon from '@mui/icons-material/Campaign';
import ShareIcon from '@mui/icons-material/Share';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SendIcon from '@mui/icons-material/Send';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
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

const n = (value: number) => value.toLocaleString();

/** The eight headline KPI widgets, one per tile so each can be dragged on its own. */
export function buildKpiWidgets({ board, t, go }: Readonly<KpiDeps>): DashboardWidget[] {
  const { links, campaigns, ads, social, leads } = board;
  // The KPIs are separate widgets so the one this team actually watches
  // can be dragged to the front; the cards below already own their surface.
  const kpi = (
    id: string,
    x: number,
    y: number,
    content: DashboardWidget['content'],
  ): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y, w: 3, h: 2 },
    minW: 2,
    minH: 2,
    content,
  });

  return [
    kpi(
      'kpi-clicks',
      0,
      0,
      <KpiCard
        label={t('marketing.dashboard.linkClicks')}
        value={n(links.total_clicks)}
        hint={`${n(links.unique_visitors)} unique visitors`}
        icon={<LinkIcon />}
        onOpen={go('/short-links')}
      />,
    ),
    kpi(
      'kpi-revenue',
      3,
      0,
      <KpiCard
        label={t('marketing.dashboard.revenueFromLinks')}
        value={formatINR(links.revenue)}
        hint={`${n(links.conversions)} paid · ${links.conversion_rate}% of clicks`}
        icon={<PaymentsIcon />}
        onOpen={go('/short-links')}
      />,
    ),
    kpi(
      'kpi-emails',
      6,
      0,
      <KpiCard
        label={t('marketing.dashboard.emailsDelivered')}
        value={n(campaigns.recipients)}
        hint={`${campaigns.sent} campaigns · ${campaigns.open_rate}% opened`}
        icon={<EmailIcon />}
        onOpen={go('/campaigns/email')}
      />,
    ),
    kpi(
      'kpi-ads',
      9,
      0,
      <KpiCard
        label={t('marketing.dashboard.liveAds')}
        value={n(ads.live)}
        hint={ads.pending > 0 ? `${ads.pending} waiting for approval` : 'Nothing waiting for approval'}
        icon={<CampaignIcon />}
        onOpen={go(ads.pending > 0 ? '/ads-approvals' : '/live-ads')}
      />,
    ),
    kpi(
      'kpi-social-accounts',
      0,
      2,
      <KpiCard
        label={t('marketing.dashboard.connectedAccounts')}
        value={n(social.connected)}
        hint={
          social.attention > 0
            ? t('marketing.dashboard.accountsNeedAttention', { vars: { count: social.attention } })
            : t('marketing.dashboard.everyAccountHealthy')
        }
        icon={<ShareIcon />}
        onOpen={go('/social/accounts')}
      />,
    ),
    kpi(
      'kpi-engagement',
      3,
      2,
      <KpiCard
        label={t('marketing.dashboard.engagement')}
        value={n(social.engagement)}
        hint={t('marketing.dashboard.postsAndViews', { vars: { posts: n(social.posts), views: n(social.views) } })}
        icon={<FavoriteIcon />}
        onOpen={go('/social/accounts')}
      />,
    ),
    kpi(
      'kpi-posts-published',
      6,
      2,
      <KpiCard
        label={t('marketing.dashboard.postsPublished')}
        value={n(social.published)}
        hint={t('marketing.dashboard.scheduledAndFailedPosts', {
          vars: { upcoming: n(social.upcoming), failed: n(social.failed) },
        })}
        icon={<SendIcon />}
        onOpen={go('/publish/calendar')}
      />,
    ),
    kpi(
      'kpi-leads',
      9,
      2,
      <KpiCard
        label={t('marketing.dashboard.leadsFound')}
        value={n(leads.found)}
        hint={t('marketing.dashboard.leadsQualified', {
          vars: { qualified: n(leads.qualified), score: leads.qualified_score },
        })}
        icon={<PersonSearchIcon />}
        onOpen={go('/leads/instagram')}
      />,
    ),
  ];
}
