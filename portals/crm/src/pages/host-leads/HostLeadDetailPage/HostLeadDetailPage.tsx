import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { BackButton, QueryGuard } from '@duncit/ui';
import { HOST_LEAD } from '../../../api/crm.gql';
import type { HostLead } from '../../../api/crm.types';
import LeadTabs, { type LeadTab } from '../../../components/LeadTabs';
import MatchedUserBox from '../../../components/MatchedUserBox';
import AskAiDrawer, { ASK_AI_WIDTH } from '../../../components/ask-ai/AskAiDrawer';
import { askAiLead } from '../../../components/ask-ai/askAiLead';
import { hostVariableValues } from '../../../config/leadVariables';
import { useTranslation } from '@duncit/shell';
import { leadDate } from './helpers';
import { buildHostLeadTabs } from './buildHostLeadTabs';
import HostHeroCard from './HostHeroCard';
import HostStatTiles from './HostStatTiles';
import { useLeadEditorOrigin } from '../../../hooks/useLeadEditorFlow';

export default function HostLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorOrigin = useLeadEditorOrigin();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<{ hostLead: HostLead | null }>(HOST_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.hostLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText={t('crm.hostLeads.hostLeadNotFound')} />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const preferredDate = leadDate(lead.preferred_event_date);

  const tabs: LeadTab[] = buildHostLeadTabs({ lead, t, followUpLabel, preferredDate });

  return (
    <Stack spacing={2.5} sx={{ transition: 'margin 0.2s ease', mr: aiOpen ? { xs: 0, sm: `${ASK_AI_WIDTH}px` } : 0 }}>
      {/* Back action above the title (per design spec). */}
      <Box>
        <BackButton onClick={() => navigate('/host-leads')}>{t('crm.hostLeads.backToHostLeads')}</BackButton>
      </Box>

      <HostHeroCard
        lead={lead}
        t={t}
        onAskAi={() => setAiOpen(true)}
        onEdit={() => navigate(`/host-leads/${lead.id}`, { state: editorOrigin })}
      />

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <HostStatTiles lead={lead} t={t} followUpLabel={followUpLabel} />

      <LeadTabs tabs={tabs} data-testid="host-lead-tabs" />

      <AskAiDrawer
        open={aiOpen}
        entity="HOST_LEAD"
        lead={askAiLead(lead, lead.host_name)}
        variableValues={hostVariableValues(lead)}
        onClose={() => setAiOpen(false)}
      />
    </Stack>
  );
}
