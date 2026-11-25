import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BackButton, QueryGuard } from '@duncit/ui';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { DuncitButton } from '@duncit/buttons';
import { ECOMM_LEAD } from '../../api/crm.gql';
import type { EcommLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import LeadStatTile from '../../components/LeadStatTile';
import { crmServicesHint } from '@duncit/utils';
import LeadTabs from '../../components/LeadTabs';
import LeadContactActions from '../../components/LeadContactActions';
import MatchedUserBox, { MatchedUserChip } from '../../components/MatchedUserBox';
import { buildEcommLeadTabs } from './ecommLeadTabs';
import { formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { useLeadEditorOrigin } from '../../hooks/useLeadEditorFlow';
import AskAiDrawer from '../../components/ask-ai/AskAiDrawer';
import AskAiButton from '../../components/ask-ai/AskAiButton';
import { askAiLead, askAiShift } from '../../components/ask-ai/askAiLead';
import { LeadQualityHeaderRing } from '../../components/lead-quality-tab';

const leadDate = (iso?: string | null) => adminDate(iso) || null;

export default function EcommLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorOrigin = useLeadEditorOrigin();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<{ ecommLead: EcommLead | null }>(ECOMM_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.ecommLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText={t('crm.ecommLeads.ecommLeadNotFound')} />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const tabs = buildEcommLeadTabs(lead, t);

  return (
    <Stack spacing={2.5} sx={askAiShift(aiOpen)}>
      <Box>
        <BackButton onClick={() => navigate('/ecomm-leads')}>{t('crm.ecommLeads.backToEcommLeads')}</BackButton>
      </Box>

      <Card
        sx={(t) => ({
          background: `linear-gradient(135deg, ${alpha(t.palette.info.main, 0.08)} 0%, ${alpha(
            t.palette.background.paper,
            1
          )} 60%)`,
        })}
      >
        <CardContent>
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            {lead.profile_photo_url && (
              <Avatar alt="" src={lead.profile_photo_url} sx={{ width: 56, height: 56, bgcolor: 'action.hover' }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h1" data-testid="lead-detail-name"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  wordBreak: 'break-word'
                }}>
                {lead.seller_name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                  mt: 1
                }}>
                <StatusChip value={lead.lead_status} />
                <PriorityChip value={lead.priority} />
                {lead.city && <Chip size="small" icon={<LocationOnIcon fontSize="small" />} label={lead.city} variant="outlined" />}
                {lead.brand_name && <Chip size="small" label={lead.brand_name} variant="outlined" />}
                {lead.super_category?.name && (
                  <Chip size="small" color="primary" label={lead.super_category.name} variant="outlined" />
                )}
                {lead.matched_user && <MatchedUserChip matched={lead.matched_user} />}
              </Stack>
              {lead.tags.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  data-testid="ecomm-tags"
                  sx={{
                    flexWrap: "wrap",
                    mt: 1
                  }}>
                  {lead.tags.map((t) => (
                    <Chip key={t} size="small" label={`#${t}`} variant="outlined" />
                  ))}
                </Stack>
              )}
              <LeadContactActions
                entity="ECOMM_LEAD"
                leadId={lead.id}
                displayName={lead.seller_name}
                email={lead.contacts?.[0]?.email}
                mobile={lead.contacts?.[0]?.mobile_number}
                whatsapp={lead.contacts?.[0]?.whatsapp_number}
              />
            </Box>
            <AskAiButton onClick={() => setAiOpen(true)} />
            <DuncitButton startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/ecomm-leads/${lead.id}`, { state: editorOrigin })}>
              {t('shell.common.edit')}
            </DuncitButton>
            <LeadQualityHeaderRing entity="ECOMM_LEAD" leadId={lead.id} />
          </Stack>
        </CardContent>
      </Card>

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label={t('crm.ecommLeads.catalogue')}
          value={lead.catalog_size || '—'}
          hint={lead.price_range ? t('crm.leadDetail.priceRange', { vars: { range: lead.price_range } }) : t('crm.leadDetail.priceRangeNotSet')}
          icon={<Inventory2Icon fontSize="small" />}
          accent="info"
        />
        <LeadStatTile
          label={t('crm.common.services')}
          value={lead.services_offered.length}
          hint={crmServicesHint(lead.services_offered) || t('crm.leadDetail.noneTagged')}
          icon={<HandymanIcon fontSize="small" />}
          accent="secondary"
        />
        <LeadStatTile
          label={t('crm.ecommLeads.monthlyOrders')}
          value={lead.monthly_orders || '—'}
          hint={lead.fulfilment_mode ? t('crm.leadDetail.fulfilment', { vars: { mode: lead.fulfilment_mode } }) : t('crm.leadDetail.fulfilmentNotSet')}
          icon={<ShoppingCartIcon fontSize="small" />}
          accent="primary"
        />
        <LeadStatTile
          label={t('crm.common.nextFollowUp')}
          value={followUpLabel}
          hint={lead.assigned_to ? t('crm.prospectLeads.assignedTo', { vars: { name: lead.assigned_to } }) : t('crm.prospectLeads.unassigned')}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      <LeadTabs tabs={tabs} data-testid="ecomm-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity="ECOMM_LEAD" lead={askAiLead(lead, lead.seller_name)} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
