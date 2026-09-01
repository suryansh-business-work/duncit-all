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
import LeadTabs from '../../components/LeadTabs';
import MatchedUserBox, { MatchedUserChip } from '../../components/MatchedUserBox';
import { buildEcommLeadTabs } from './ecommLeadTabs';
import { formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const leadDate = (iso?: string | null) => adminDate(iso) || null;

export default function EcommLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ ecommLead: EcommLead | null }>(ECOMM_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.ecommLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText="Ecomm lead not found." />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const tabs = buildEcommLeadTabs(lead, t);

  return (
    <Stack spacing={2.5}>
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
              <Avatar src={lead.profile_photo_url} sx={{ width: 56, height: 56, bgcolor: 'action.hover' }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
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
            </Box>
            <DuncitButton startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/ecomm-leads/${lead.id}`)}>
              {t('shell.common.edit')}
            </DuncitButton>
          </Stack>
        </CardContent>
      </Card>

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label={t('crm.ecommLeads.catalogue')}
          value={lead.catalog_size || '—'}
          hint={lead.price_range ? `Price range ${lead.price_range}` : 'Price range not set'}
          icon={<Inventory2Icon fontSize="small" />}
          accent="info"
        />
        <LeadStatTile
          label={t('crm.common.services')}
          value={lead.services_offered.length}
          hint={
            lead.services_offered.length
              ? lead.services_offered
                  .slice(0, 2)
                  .map((s) => (s.service === 'Other' ? s.custom_name || 'Other' : s.service))
                  .join(', ')
              : 'None tagged'
          }
          icon={<HandymanIcon fontSize="small" />}
          accent="secondary"
        />
        <LeadStatTile
          label={t('crm.ecommLeads.monthlyOrders')}
          value={lead.monthly_orders || '—'}
          hint={lead.fulfilment_mode ? `Fulfilment: ${lead.fulfilment_mode}` : 'Fulfilment not set'}
          icon={<ShoppingCartIcon fontSize="small" />}
          accent="primary"
        />
        <LeadStatTile
          label={t('crm.common.nextFollowUp')}
          value={followUpLabel}
          hint={lead.assigned_to ? `Assigned to ${lead.assigned_to}` : 'Unassigned'}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      <LeadTabs tabs={tabs} data-testid="ecomm-lead-tabs" />
    </Stack>
  );
}
