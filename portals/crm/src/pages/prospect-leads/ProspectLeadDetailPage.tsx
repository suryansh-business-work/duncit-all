import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { BackButton, QueryGuard } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { ProspectLeadEntity } from '../../api/crm.types';
import type { ProspectLead } from '../../api/prospectLeads.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import LeadStatTile from '../../components/LeadStatTile';
import LeadTabs from '../../components/LeadTabs';
import LeadContactActions from '../../components/LeadContactActions';
import { useLeadEditorOrigin } from '../../hooks/useLeadEditorFlow';
import AskAiDrawer from '../../components/ask-ai/AskAiDrawer';
import AskAiButton from '../../components/ask-ai/AskAiButton';
import { askAiLead, askAiShift } from '../../components/ask-ai/askAiLead';
import { LeadQualityHeaderRing } from '../../components/lead-quality-tab';
import { PROSPECT_KINDS } from './prospectKinds';
import { buildProspectLeadTabs } from './prospectLeadTabs';
import { kindChip, statTiles } from './prospectDetails';

/** Read-only detail page for one creator or community lead. */
export default function ProspectLeadDetailPage({ entity }: Readonly<{ entity: ProspectLeadEntity }>) {
  const kind = PROSPECT_KINDS[entity];
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorOrigin = useLeadEditorOrigin();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<Record<string, ProspectLead | null>, { id?: string }>(kind.docs.get, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.[kind.docs.getKey];

  if ((loading && !lead) || error || !lead) {
    return <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText={t(kind.copy.notFound)} />;
  }

  const name = kind.displayName(lead);
  const chip = kindChip(lead);

  return (
    <Stack spacing={2.5} sx={askAiShift(aiOpen)}>
      <Box>
        <BackButton onClick={() => navigate(kind.basePath)}>{t(kind.copy.back)}</BackButton>
      </Box>

      <Card
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${theme.palette.background.paper} 60%)`,
        })}
      >
        <CardContent>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {lead.profile_photo_url && (
              <Avatar alt="" src={lead.profile_photo_url} sx={{ width: 56, height: 56, bgcolor: 'action.hover' }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h1" data-testid="lead-detail-name" variant="h5" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                {name}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                <StatusChip value={lead.lead_status} />
                <PriorityChip value={lead.priority} />
                {lead.city && <Chip size="small" icon={<LocationOnIcon fontSize="small" />} label={lead.city} variant="outlined" />}
                {chip && <Chip size="small" label={chip} variant="outlined" />}
                {lead.super_category?.name && (
                  <Chip size="small" color="primary" label={lead.super_category.name} variant="outlined" />
                )}
              </Stack>
              {lead.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                  {lead.tags.map((tag) => (
                    <Chip key={tag} size="small" label={`#${tag}`} variant="outlined" />
                  ))}
                </Stack>
              )}
              <LeadContactActions
                entity={entity}
                leadId={lead.id}
                displayName={name}
                email={lead.contacts?.[0]?.email}
                mobile={lead.contacts?.[0]?.mobile_number}
                whatsapp={lead.contacts?.[0]?.whatsapp_number}
              />
            </Box>
            <AskAiButton onClick={() => setAiOpen(true)} />
            <DuncitButton
              startIcon={<EditIcon />}
              variant="contained"
              onClick={() => navigate(`${kind.basePath}/${lead.id}`, { state: editorOrigin })}
            >
              {t('shell.common.edit')}
            </DuncitButton>
            <LeadQualityHeaderRing entity={entity} leadId={lead.id} />
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {statTiles(lead, t).map((tile) => (
          <LeadStatTile key={tile.key} label={tile.label} value={tile.value} hint={tile.hint} icon={tile.icon} accent={tile.accent} />
        ))}
        <LeadStatTile
          label={t('crm.common.nextFollowUp')}
          value={formatDate(lead.next_follow_up_date) || '—'}
          hint={lead.assigned_to ? t('crm.prospectLeads.assignedTo', { vars: { name: lead.assigned_to } }) : t('crm.prospectLeads.unassigned')}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      <LeadTabs tabs={buildProspectLeadTabs(entity, lead, name, t)} data-testid="prospect-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity={entity} lead={askAiLead(lead, name)} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
