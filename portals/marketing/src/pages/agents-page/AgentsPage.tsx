import { fireAndForget, logs } from '@duncit/logs';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { DuncitButton } from '@duncit/buttons';
import { EmptyState, PageHeader, type PortalTourStep } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import { parseApiError } from '@duncit/utils';
import type { Translate } from '../activity-page/runFormat';
import RunsGuide from '../activity-page/RunsGuide';
import AgentCard from './AgentCard';
import { canManageAgents } from './copy';
import { MARKETING_AGENTS, type MarketingAgent } from './queries';

const TOUR_ID = 'marketing.agents';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'agent-switch', title: t('marketing.agents.tourSwitchTitle'), body: t('marketing.agents.tourSwitchBody') },
  { anchor: 'agent-schedule', title: t('marketing.agents.tourScheduleTitle'), body: t('marketing.agents.tourScheduleBody') },
  { anchor: 'agent-run', title: t('marketing.agents.tourRunTitle'), body: t('marketing.agents.tourRunBody') },
];

/**
 * Marketing → Automation → Agents: one card per agent the console ships.
 * A manager switches them on, sets when they run and what they are told,
 * and runs one now; an editor reads the same cards. Every run lands on
 * Activity under the AGENT workflow.
 */
export default function AgentsPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const canManage = canManageAgents(user?.roles ?? []);
  const { data, loading, error, refetch } = useQuery<{ marketingAgents: MarketingAgent[] }>(MARKETING_AGENTS);
  const agents = data?.marketingAgents ?? [];
  const noneEnabled = agents.length > 0 && agents.every((agent) => !agent.enabled);

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="agents-page">
      <PageHeader title={t('marketing.agents.title')} subtitle={t('marketing.agents.subtitle')} />
      {/* Mounted with the cards, not before them: the tour looks for its anchors on its first paint. */}
      {!loading && (
        <RunsGuide
          id={TOUR_ID}
          summary={t('marketing.agents.introSummary')}
          steps={[t('marketing.agents.introStep1'), t('marketing.agents.introStep2'), t('marketing.agents.introStep3')]}
          tour={tourSteps(t)}
        />
      )}
      {loading && !data && <LinearProgress data-testid="agents-loading" />}
      {error && (
        <Alert
          severity="error"
          data-testid="agents-error"
          action={
            <DuncitButton size="small" color="inherit" onClick={() => fireAndForget(refetch(), logs.portal.marketing, 'agents', 'AgentsPage')}>
              {t('marketing.agents.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error)}
        </Alert>
      )}
      {!loading && !error && agents.length === 0 && (
        <EmptyState icon={<SmartToyOutlinedIcon />} title={t('marketing.agents.emptyTitle')} body={t('marketing.agents.emptyBody')} data-testid="agents-empty" />
      )}
      {noneEnabled && (
        <EmptyState compact icon={<SmartToyOutlinedIcon />} title={t('marketing.agents.noneEnabledTitle')} body={t('marketing.agents.noneEnabledBody')} data-testid="agents-none-enabled" />
      )}
      {!canManage && agents.length > 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="agents-read-only">
          {t('marketing.agents.readOnly')}
        </Typography>
      )}
      {agents.map((agent) => (
        <AgentCard key={agent.key} agent={agent} canManage={canManage} />
      ))}
    </Stack>
  );
}
