import { fireAndForget, logs } from '@duncit/logs';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { AGENT_DESCRIPTION, AGENT_NAME, isKnownAgent } from './copy';
import AgentForm, { toUpdateInput, type AgentFormOutput } from './agent-form';
import AgentRunStatus from './AgentRunStatus';
import { useAgentActions } from './useAgentActions';
import type { MarketingAgent } from './queries';

interface Props {
  agent: MarketingAgent;
  /** A manager switches, saves and runs; anyone else reads. */
  canManage: boolean;
}

const SWITCH_COLORS = { ON: 'success', OFF: 'default' } as const;

/**
 * One agent: its switch, when it runs, what it is told, and how its last run
 * went. The name and description come from the catalogue's keys when the
 * portal knows the agent, else from the server's own words.
 */
export default function AgentCard({ agent, canManage }: Readonly<Props>) {
  const { t } = useTranslation();
  const { busy, save, run } = useAgentActions(agent.key);
  const known = isKnownAgent(agent.key);
  const name = known ? t(AGENT_NAME[agent.key]) : agent.name;
  const description = known ? t(AGENT_DESCRIPTION[agent.key]) : agent.description;
  const stateLabel = t(agent.enabled ? 'marketing.agents.on' : 'marketing.agents.off');

  const submit = (values: AgentFormOutput) => save(toUpdateInput(values, agent.has_params));

  const action = canManage ? (
    <FormControlLabel
      data-tour="agent-switch"
      label={stateLabel}
      labelPlacement="start"
      control={
        <Switch
          checked={agent.enabled}
          disabled={busy}
          onChange={(event) => fireAndForget(save({ enabled: event.target.checked }), logs.portal.marketing, 'agents', 'AgentCard')}
          slotProps={{ input: { 'aria-label': t('marketing.agents.enabledLabel', { vars: { name } }) } }}
          data-testid={`agent-switch-${agent.key}`}
        />
      }
    />
  ) : (
    <StatusChip status={agent.enabled ? 'ON' : 'OFF'} colorMap={SWITCH_COLORS} label={stateLabel} data-testid={`agent-state-${agent.key}`} />
  );

  return (
    <SectionCard title={name} subtitle={description} icon={<SmartToyOutlinedIcon color="action" />} action={action}>
      <Stack spacing={2} data-testid={`agent-card-${agent.key}`}>
        <AgentRunStatus agent={agent} busy={busy} onRun={canManage ? run : undefined} />
        {agent.needs_approval && (
          <Alert severity="info" data-testid="agent-approval-note">
            {t('marketing.agents.approvalNote')}
          </Alert>
        )}
        <AgentForm agent={agent} readOnly={!canManage} busy={busy} onSubmit={submit} />
      </Stack>
    </SectionCard>
  );
}
