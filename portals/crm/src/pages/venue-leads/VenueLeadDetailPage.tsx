import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BackButton, QueryGuard } from '@duncit/ui';
import EditIcon from '@mui/icons-material/Edit';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ContactsIcon from '@mui/icons-material/Contacts';
import EventIcon from '@mui/icons-material/Event';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import LinkIcon from '@mui/icons-material/Link';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { VENUE_LEAD } from '../../api/crm.gql';
import type { VenueLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import LeadContactActions from '../../components/LeadContactActions';
import ContactsTab from '../../components/contacts-tab';
import LeadStatTile from '../../components/LeadStatTile';
import LeadTabs, { type LeadTab } from '../../components/LeadTabs';
import ServicesGrid from '../../components/ServicesGrid';
import CommsLogsSection from '../../components/CommsLogsSection';
import ManualLogsTab from '../../components/ManualLogsTab';
import WebsitePagesTab from '../../components/website-pages-tab';
import RemindersTab from '../../components/reminders-tab';
import AskAiDrawer, { ASK_AI_WIDTH } from '../../components/ask-ai/AskAiDrawer';
import MapEmbed from '../../components/MapEmbed';
import DynamicValuesView from '../../components/DynamicValuesView';
import LeadSurveyTab from '../../components/lead-survey/LeadSurveyTab';
import MatchedUserBox, { MatchedUserChip } from '../../components/MatchedUserBox';
import { venueVariableValues } from '../../config/leadVariables';
import { formatDateTime, formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : '—');

const leadDate = (iso?: string | null) => adminDate(iso) || null;

const formatCapacity = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min} – ${max}`;
  return String(min ?? max ?? '—');
};

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
  const tabs: LeadTab[] = [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <HomeWorkIcon fontSize="small" />,
      render: () => (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            <LeadDetailCard title={t('crm.venueLeads.venueDetails')} icon={<HomeWorkIcon color="primary" />}>
              <LeadDetailRow label={t('crm.common.superCategory2')} value={lead.super_category?.name || '—'} />
              <LeadDetailRow label={t('crm.venueLeads.types')} value={joinList(lead.venue_types)} />
              <LeadDetailRow label={t('crm.venueLeads.space')} value={lead.space_type || '—'} />
              <LeadDetailRow label={t('crm.venueLeads.capacity')} value={formatCapacity(lead.capacity_min, lead.capacity_max)} />
              <LeadDetailRow label={t('shell.common.description')} value={lead.venue_description || '—'} />
            </LeadDetailCard>

            <LeadDetailCard title={t('crm.common.location')} icon={<LocationOnIcon color="primary" />}>
              <LeadDetailRow label={t('crm.common.city')} value={lead.city} />
              <LeadDetailRow label={t('crm.common.area')} value={lead.area || '—'} />
              <LeadDetailRow label={t('crm.common.address')} value={lead.full_address} />
              <LeadDetailRow label={t('crm.common.landmark')} value={lead.landmark || '—'} />
              <Box sx={{ mt: 1.5 }}>
                <MapEmbed
                  address={[lead.full_address, lead.area, lead.city].filter(Boolean).join(', ')}
                  mapLink={lead.map_link}
                />
              </Box>
            </LeadDetailCard>

            <LeadDetailCard title={t('crm.venueLeads.availabilityAndSuitability')} icon={<EventIcon color="primary" />}>
              <LeadDetailRow label={t('crm.venueLeads.days')} value={joinList(lead.available_days)} />
              <LeadDetailRow label={t('crm.venueLeads.timeSlots')} value={lead.available_time_slots || '—'} />
              <LeadDetailRow label={t('crm.venueLeads.bookingNotice')} value={lead.booking_notice || '—'} />
              <LeadDetailRow label={t('crm.venueLeads.suitableFor')} value={joinList(lead.event_suitability)} />
              <LeadDetailRow label={t('crm.venueLeads.amenities')} value={joinList(lead.amenities)} />
            </LeadDetailCard>
          </Stack>

          <Stack spacing={2.5} sx={{ width: { lg: 360 }, flexShrink: 0 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                  <StickyNote2Icon color="primary" />
                  <Typography variant="subtitle1" fontWeight={800}>
                    Lead tracking
                  </Typography>
                </Stack>
                <LeadDetailRow label={t('crm.common.source')} value={lead.lead_source || '—'} />
                <LeadDetailRow label={t('crm.common.assignedTo')} value={lead.assigned_to || '—'} />
                <LeadDetailRow label="Follow-up" value={followUpLabel} />
                <Divider sx={{ my: 1 }} />
                <LeadDetailRow label={t('shell.common.created')} value={lead.created_at ? formatDateTime(lead.created_at) : '—'} />
                <LeadDetailRow label={t('shell.common.updated')} value={lead.updated_at ? formatDateTime(lead.updated_at) : '—'} />
                {lead.remarks && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                      REMARKS
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                      {lead.remarks}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      ),
    },

    {
      value: 'contacts',
      label: `Contacts (${lead.contacts.length})`,
      icon: <ContactsIcon fontSize="small" />,
      render: () => (
        <ContactsTab entity="VENUE_LEAD" leadId={lead.id} leadName={lead.venue_name} contacts={lead.contacts} />
      ),
    },

    {
      value: 'commercial',
      label: t('crm.venueLeads.commercial'),
      icon: <CurrencyRupeeIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard title={t('crm.venueLeads.commercial')} icon={<CurrencyRupeeIcon color="primary" />}>
          <LeadDetailRow label={t('crm.venueLeads.pricingModels')} value={joinList(lead.pricing_models)} />
          <LeadDetailRow label={t('crm.venueLeads.expectedCharges')} value={lead.expected_charges ? `₹ ${lead.expected_charges}` : '—'} />
          <LeadDetailRow label={t('crm.venueLeads.securityDeposit')} value={lead.security_deposit ? `₹ ${lead.security_deposit}` : '—'} />
          <LeadDetailRow label="GST" value={lead.gst_applicable ? 'Applicable' : 'No'} />
          <LeadDetailRow label={t('crm.venueLeads.invoice')} value={lead.invoice_available ? 'Available' : 'No'} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'services',
      label: `Services (${lead.services_offered.length})`,
      icon: <HandymanIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard
          title={t('crm.common.servicesOffered')}
          subtitle={
            lead.services_offered.length
              ? `${lead.services_offered.length} service${servicesPlural} tagged`
              : 'Catalogue managed via Manage Venue Services'
          }
          icon={<HandymanIcon color="primary" />}
        >
          <ServicesGrid services={lead.services_offered} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'survey',
      label: t('crm.common.survey'),
      icon: <AssignmentIcon fontSize="small" />,
      render: () => <LeadSurveyTab entity="VENUE_LEAD" leadId={lead.id} />,
    },

    {
      value: 'website',
      label: t('crm.common.website'),
      icon: <LanguageIcon fontSize="small" />,
      render: () => <WebsitePagesTab entity="VENUE_LEAD" leadId={lead.id} website={lead.website} />,
    },

    {
      value: 'reminders',
      label: t('shell.nav.reminders'),
      icon: <EventAvailableIcon fontSize="small" />,
      render: () => <RemindersTab entity="VENUE_LEAD" leadId={lead.id} />,
    },

    {
      value: 'linked-hosts',
      label: `Linked Hosts (${lead.linked_hosts.length})`,
      icon: <LinkIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard
          title={t('crm.venueLeads.linkedHosts')}
          subtitle={t('crm.venueLeads.hostLeadsAssociatedWithThisVenue')}
          icon={<LinkIcon color="primary" />}
        >
          {lead.linked_hosts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hosts linked yet. Open Edit → "Linked Hosts" to associate host leads.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.25,
              }}
            >
              {lead.linked_hosts.map((h) => (
                <Card
                  key={h.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    transition: 'border-color 120ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => navigate(`/host-leads/${h.id}/view`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/host-leads/${h.id}/view`);
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>
                      {h.host_name}
                    </Typography>
                    <StatusChip value={h.lead_status} />
                    <PriorityChip value={h.priority} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {[h.host_type, h.city].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </Card>
              ))}
            </Box>
          )}
        </LeadDetailCard>
      ),
    },

    {
      value: 'custom-fields',
      label: t('crm.common.customFields2'),
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard
          title={t('crm.common.customFields')}
          subtitle={t('crm.common.adminDefinedFieldsFromSettingsDynamic')}
        >
          <DynamicValuesView entity="VENUE_LEAD" json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'manual-logs',
      label: t('crm.common.manualLogs'),
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <ManualLogsTab entityType="VENUE_LEAD" entityId={lead.id} activities={lead.activity_log} />
      ),
    },

    {
      value: 'communications',
      label: t('crm.common.communications'),
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType="VENUE_LEAD" entityId={lead.id} />,
    },
  ];

  return (
    <Stack spacing={2.5} sx={{ transition: 'margin 0.2s ease', mr: aiOpen ? { xs: 0, sm: `${ASK_AI_WIDTH}px` } : 0 }}>
      {/* Back action above the title (per design spec). Sits outside the
          hero card so it reads as a navigation breadcrumb, not part of the
          venue's identity row. */}
      <Box>
        <BackButton onClick={() => navigate('/venue-leads')}>{t('crm.venueLeads.backToVenueLeads')}</BackButton>
      </Box>

      {/* ---- Hero card (Venue details on top, per spec) ---- */}
      <Card
        sx={(t) => ({
          background: `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${alpha(
            t.palette.background.paper,
            1
          )} 60%)`,
        })}
      >
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
            {lead.logo_url && (
              <Avatar
                src={lead.logo_url}
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: 'action.hover' }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                {lead.venue_name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                <StatusChip value={lead.lead_status} />
                <PriorityChip value={lead.priority} />
                {lead.city && (
                  <Chip
                    size="small"
                    icon={<LocationOnIcon fontSize="small" />}
                    label={lead.city}
                    variant="outlined"
                  />
                )}
                {lead.super_category?.name && (
                  <Chip size="small" color="primary" label={lead.super_category.name} variant="outlined" />
                )}
                {lead.matched_user && <MatchedUserChip matched={lead.matched_user} />}
                {(lead.venue_types ?? []).slice(0, 2).map((tag) => (
                  <Chip key={tag} size="small" label={tag} variant="outlined" />
                ))}
                {(lead.venue_types?.length ?? 0) > 2 && (
                  <Chip size="small" label={`+${(lead.venue_types?.length ?? 0) - 2} more`} variant="outlined" />
                )}
              </Stack>
              {lead.tags.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mt: 1 }}
                  flexWrap="wrap"
                  useFlexGap
                  data-testid="venue-tags"
                >
                  {lead.tags.map((t) => (
                    <Chip key={t} size="small" label={`#${t}`} variant="outlined" />
                  ))}
                </Stack>
              )}
              <LeadContactActions
                entity="VENUE_LEAD"
                leadId={lead.id}
                displayName={lead.venue_name}
                email={lead.contacts?.[0]?.email}
                mobile={lead.contacts?.[0]?.mobile_number}
                whatsapp={lead.contacts?.[0]?.whatsapp_number}
                variableValues={venueVariableValues(lead)}
              />
            </Box>
            <Button startIcon={<SmartToyIcon />} color="secondary" variant="outlined" onClick={() => setAiOpen(true)}>
              {t('crm.components.askAi')}
            </Button>
            <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/venue-leads/${lead.id}`)}>
              {t('shell.common.edit')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      {/* ---- Stat tiles ---- */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label={t('crm.venueLeads.capacity')}
          value={formatCapacity(lead.capacity_min, lead.capacity_max)}
          hint={lead.space_type ? lead.space_type : 'Indoor / outdoor not set'}
          icon={<GroupsIcon fontSize="small" />}
          accent="primary"
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
          label={t('crm.venueLeads.expectedCharges')}
          value={lead.expected_charges ? `₹${lead.expected_charges.toLocaleString()}` : '—'}
          hint={lead.security_deposit ? `Deposit ₹${lead.security_deposit.toLocaleString()}` : 'No deposit set'}
          icon={<CurrencyRupeeIcon fontSize="small" />}
          accent="success"
        />
        <LeadStatTile
          label={t('crm.common.nextFollowUp')}
          value={followUpLabel}
          hint={lead.assigned_to ? `Assigned to ${lead.assigned_to}` : 'Unassigned'}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      {/* ---- Tabs (non-details sections) ---- */}
      <LeadTabs tabs={tabs} data-testid="venue-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity="VENUE_LEAD" leadId={lead.id} leadName={lead.venue_name} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
