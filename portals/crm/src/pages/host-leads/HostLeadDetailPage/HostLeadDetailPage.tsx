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
import { useTranslation } from '@duncit/shell';
import { leadDate } from './helpers';
import { buildHostLeadTabs } from './buildHostLeadTabs';
import HostHeroCard from './HostHeroCard';
import HostStatTiles from './HostStatTiles';

export default function HostLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<{ hostLead: HostLead | null }>(HOST_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.hostLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText="Host lead not found." />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const preferredDate = leadDate(lead.preferred_event_date);
  const servicesPlural = lead.services_offered.length === 1 ? '' : 's';

  const tabs: LeadTab[] = buildHostLeadTabs({ lead, t, followUpLabel, preferredDate, servicesPlural });

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
        onEdit={() => navigate(`/host-leads/${lead.id}`)}
      />

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <HostStatTiles lead={lead} t={t} followUpLabel={followUpLabel} />

      <LeadTabs tabs={tabs} data-testid="host-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity="HOST_LEAD" leadId={lead.id} leadName={lead.host_name} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
