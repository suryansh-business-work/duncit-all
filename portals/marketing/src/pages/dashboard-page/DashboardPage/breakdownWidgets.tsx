import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/app-settings';
import { formatINR } from '@duncit/utils';
import BreakdownCard from '../../short-links-page/detail/BreakdownCard';
import { PLATFORM_LABEL } from '../../social-accounts-page/copy';
import { LEAD_STATUS_LABEL } from '../../instagram-leads-page/copy';
import type { DashboardPoint, MarketingDashboard } from '../queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Deps {
  board: MarketingDashboard;
  t: Translate;
}

/** Server codes become the labels the rest of the console uses; a code with no label stays as it is. */
const labelled = (rows: DashboardPoint[], labels: Record<string, string>, t: Translate): DashboardPoint[] =>
  rows.map((row) => ({ label: labels[row.label] ? t(labels[row.label]) : row.label, count: row.count }));

/** Only the states with something in them — an all-zero card has no shape to draw. */
const automationRows = (runs: MarketingDashboard['runs'], t: Translate): DashboardPoint[] =>
  [
    { label: t('marketing.dashboard.runsAwaitingApproval'), count: runs.awaiting_approval },
    { label: t('marketing.dashboard.runsRunning'), count: runs.running },
    { label: t('marketing.dashboard.runsCompleted'), count: runs.completed },
    { label: t('marketing.dashboard.runsFailed'), count: runs.failed },
  ].filter((row) => row.count > 0);

/** The two breakdown rows under the charts: where traffic came from, and what social, leads and automation did. */
export function buildBreakdownWidgets({ board, t }: Readonly<Deps>): DashboardWidget[] {
  const { links, campaigns, audience, social, leads, runs } = board;
  const card = (id: string, x: number, y: number, content: DashboardWidget['content']): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    content,
  });
  const noClicks = t('marketing.dashboard.noClicksRecordedYet');

  return [
    card(
      'click-sources',
      0,
      15,
      <BreakdownCard title={t('marketing.dashboard.whereClicksCameFrom')} rows={links.platforms} emptyText={noClicks} />,
    ),
    card(
      'click-countries',
      4,
      15,
      <BreakdownCard title={t('marketing.common.countries')} rows={links.countries} emptyText={noClicks} />,
    ),
    card(
      'setup-summary',
      8,
      15,
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
      />,
    ),
    card(
      'social-engagement',
      0,
      20,
      <BreakdownCard
        title={t('marketing.dashboard.engagementByNetwork')}
        rows={labelled(social.by_platform, PLATFORM_LABEL, t)}
        emptyText={t('marketing.dashboard.noEngagementYet')}
      />,
    ),
    card(
      'lead-pipeline',
      4,
      20,
      <BreakdownCard
        title={t('marketing.dashboard.leadsByStage')}
        rows={labelled(leads.by_status, LEAD_STATUS_LABEL, t)}
        emptyText={t('marketing.dashboard.noLeadsYet')}
      />,
    ),
    card(
      'automation',
      8,
      20,
      <BreakdownCard
        title={
          runs.spend > 0
            ? t('marketing.dashboard.automationWithSpend', { vars: { spend: formatINR(runs.spend) } })
            : t('marketing.dashboard.automation')
        }
        rows={automationRows(runs, t)}
        emptyText={t('marketing.dashboard.nothingHasRunYet')}
      />,
    ),
  ];
}
