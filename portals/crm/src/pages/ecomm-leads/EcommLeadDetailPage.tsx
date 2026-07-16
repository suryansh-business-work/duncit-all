import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BackButton, QueryGuard } from '@duncit/ui';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { ECOMM_LEAD } from '../../api/crm.gql';
import type { EcommLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import LeadStatTile from '../../components/LeadStatTile';
import LeadTabs from '../../components/LeadTabs';
import MatchedUserBox, { MatchedUserChip } from '../../components/MatchedUserBox';
import { buildEcommLeadTabs } from './ecommLeadTabs';

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function EcommLeadDetailPage() {
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

  const followUpLabel = formatDate(lead.next_follow_up_date) ?? '—';
  const tabs = buildEcommLeadTabs(lead);

  return (
    <Stack spacing={2.5}>
      <Box>
        <BackButton onClick={() => navigate('/ecomm-leads')}>Back to Ecomm Leads</BackButton>
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
          <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
            {lead.profile_photo_url && (
              <Avatar src={lead.profile_photo_url} sx={{ width: 56, height: 56, bgcolor: 'action.hover' }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                {lead.seller_name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
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
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap data-testid="ecomm-tags">
                  {lead.tags.map((t) => (
                    <Chip key={t} size="small" label={`#${t}`} variant="outlined" />
                  ))}
                </Stack>
              )}
            </Box>
            <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/ecomm-leads/${lead.id}`)}>
              Edit
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label="Catalogue"
          value={lead.catalog_size || '—'}
          hint={lead.price_range ? `Price range ${lead.price_range}` : 'Price range not set'}
          icon={<Inventory2Icon fontSize="small" />}
          accent="info"
        />
        <LeadStatTile
          label="Services"
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
          label="Monthly orders"
          value={lead.monthly_orders || '—'}
          hint={lead.fulfilment_mode ? `Fulfilment: ${lead.fulfilment_mode}` : 'Fulfilment not set'}
          icon={<ShoppingCartIcon fontSize="small" />}
          accent="primary"
        />
        <LeadStatTile
          label="Next follow-up"
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
