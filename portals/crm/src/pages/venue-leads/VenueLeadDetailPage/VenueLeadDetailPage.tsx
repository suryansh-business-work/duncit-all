import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { BackButton, QueryGuard } from '@duncit/ui';
import { VENUE_LEAD } from '../../../api/crm.gql';
import type { VenueLead } from '../../../api/crm.types';
import LeadTabs, { type LeadTab } from '../../../components/LeadTabs';
import AskAiDrawer, { ASK_AI_WIDTH } from '../../../components/ask-ai/AskAiDrawer';
import MatchedUserBox from '../../../components/MatchedUserBox';
import { useTranslation } from '@duncit/shell';
import { leadDate } from './helpers';
import { buildVenueLeadTabs } from './buildVenueLeadTabs';
import VenueHeroCard from './VenueHeroCard';
import VenueStatTiles from './VenueStatTiles';

export default function VenueLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<{ venueLead: VenueLead | null }>(VENUE_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.venueLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText="Venue lead not found." />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const servicesPlural = lead.services_offered.length === 1 ? '' : 's';

  // ---- Tab definitions ----
  const tabs: LeadTab[] = buildVenueLeadTabs({ lead, t, navigate, followUpLabel, servicesPlural });

  return (
    <Stack spacing={2.5} sx={{ transition: 'margin 0.2s ease', mr: aiOpen ? { xs: 0, sm: `${ASK_AI_WIDTH}px` } : 0 }}>
      {/* Back action above the title (per design spec). Sits outside the
          hero card so it reads as a navigation breadcrumb, not part of the
          venue's identity row. */}
      <Box>
        <BackButton onClick={() => navigate('/venue-leads')}>{t('crm.venueLeads.backToVenueLeads')}</BackButton>
      </Box>

      {/* ---- Hero card (Venue details on top, per spec) ---- */}
      <VenueHeroCard
        lead={lead}
        t={t}
        onAskAi={() => setAiOpen(true)}
        onEdit={() => navigate(`/venue-leads/${lead.id}`)}
      />

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      {/* ---- Stat tiles ---- */}
      <VenueStatTiles lead={lead} t={t} followUpLabel={followUpLabel} />

      {/* ---- Tabs (non-details sections) ---- */}
      <LeadTabs tabs={tabs} data-testid="venue-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity="VENUE_LEAD" leadId={lead.id} leadName={lead.venue_name} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
