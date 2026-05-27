import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ContactsIcon from '@mui/icons-material/Contacts';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import InstagramIcon from '@mui/icons-material/Instagram';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import { HOST_LEAD } from '../../api/crm.gql';
import type { HostLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import LeadStatTile from '../../components/LeadStatTile';
import LeadTabs, { type LeadTab } from '../../components/LeadTabs';
import ServicesGrid from '../../components/ServicesGrid';
import CommsLogsSection from '../../components/CommsLogsSection';
import ManualLogsTab from '../../components/ManualLogsTab';
import ExternalLink from '../../components/ExternalLink';
import DynamicValuesView from '../../components/DynamicValuesView';
import { parseApiError } from '../../utils/parseApiError';

const joinList = (values?: string[] | null) => (values && values.length ? values.join(', ') : '—');

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function HostLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ hostLead: HostLead | null }>(HOST_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.hostLead;

  if (loading && !lead) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!lead) return <Alert severity="info">Host lead not found.</Alert>;

  const followUpLabel = formatDate(lead.next_follow_up_date) ?? '—';
  const preferredDate = formatDate(lead.preferred_event_date);

  const tabs: LeadTab[] = [
    {
      value: 'overview',
      label: 'Overview',
      icon: <GroupsIcon fontSize="small" />,
      render: () => (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            <LeadDetailCard title="Host details" icon={<GroupsIcon color="primary" />}>
              <LeadDetailRow label="Super category" value={lead.super_category?.name || '—'} />
              <LeadDetailRow label="Type" value={lead.host_type || '—'} />
              <LeadDetailRow label="Organization" value={lead.organization_name || '—'} />
              <LeadDetailRow label="Interests" value={joinList(lead.interests)} />
              <LeadDetailRow label="Audience size" value={lead.expected_audience_size || '—'} />
              <LeadDetailRow label="Frequency" value={lead.frequency || '—'} />
            </LeadDetailCard>

            <LeadDetailCard title="Location" icon={<LocationOnIcon color="primary" />}>
              <LeadDetailRow label="City" value={lead.city || '—'} />
              <LeadDetailRow label="Area" value={lead.area || '—'} />
            </LeadDetailCard>

            <LeadDetailCard title="Social / Reach" icon={<InstagramIcon color="primary" />}>
              <LeadDetailRow
                label="Instagram"
                value={lead.instagram_link ? <ExternalLink variant="body2" href={lead.instagram_link} /> : '—'}
              />
              <LeadDetailRow
                label="Community link"
                value={lead.community_link ? <ExternalLink variant="body2" href={lead.community_link} /> : '—'}
              />
              <LeadDetailRow label="Community size" value={lead.community_size ?? '—'} />
              <LeadDetailRow label="Previous events" value={lead.previous_events_hosted ? 'Yes' : 'No'} />
              <LeadDetailRow label="Past attendees" value={lead.past_attendees ?? '—'} />
              <LeadDetailRow label="Intent" value={joinList(lead.host_intent_scores)} />
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
                <LeadDetailRow label="Source" value={lead.lead_source || '—'} />
                <LeadDetailRow label="Assigned to" value={lead.assigned_to || '—'} />
                <LeadDetailRow label="Follow-up" value={followUpLabel} />
                <Divider sx={{ my: 1 }} />
                <LeadDetailRow label="Created" value={lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'} />
                <LeadDetailRow label="Updated" value={lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '—'} />
                {lead.notes && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                      NOTES
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                      {lead.notes}
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
        <LeadDetailCard title="Contacts" icon={<ContactsIcon color="primary" />}>
          <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {lead.contacts.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No contacts on file yet.
              </Typography>
            )}
            {lead.contacts.map((contact, idx) => (
              <Card key={`${contact.email}-${idx}`} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {contact.name || (idx === 0 ? 'Primary contact' : `Contact ${idx + 1}`)}
                    </Typography>
                    {contact.role && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {contact.role}
                      </Typography>
                    )}
                  </Box>
                  {idx === 0 && <Chip label="Primary" size="small" color="primary" />}
                </Stack>
                <Stack spacing={0.5}>
                  {contact.mobile_number && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon fontSize="small" color="action" />
                      <Tooltip title="Call">
                        <Typography
                          component="a"
                          href={`tel:${contact.mobile_number}`}
                          variant="body2"
                          sx={{ color: 'text.primary', textDecoration: 'none' }}
                        >
                          {contact.mobile_number}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  )}
                  {contact.whatsapp_number && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                      <Typography
                        component="a"
                        href={`https://wa.me/${contact.whatsapp_number.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        variant="body2"
                        sx={{ color: 'text.primary', textDecoration: 'none' }}
                      >
                        {contact.whatsapp_number}
                      </Typography>
                    </Stack>
                  )}
                  {contact.email && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon fontSize="small" color="action" />
                      <Tooltip title="Open in mail client">
                        <Typography
                          component="a"
                          href={`mailto:${contact.email}`}
                          variant="body2"
                          sx={{ color: 'text.primary', textDecoration: 'none', wordBreak: 'break-all' }}
                        >
                          {contact.email}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </LeadDetailCard>
      ),
    },

    {
      value: 'plans',
      label: 'Plans & Timeline',
      icon: <EventIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard title="Plans & timeline" icon={<EventIcon color="primary" />}>
          <LeadDetailRow label="Budget" value={lead.budget_range || '—'} />
          <LeadDetailRow label="Revenue models" value={joinList(lead.revenue_models)} />
          <LeadDetailRow label="Needs venue" value={lead.need_venue ? 'Yes' : 'No'} />
          <LeadDetailRow label="Needs vendor" value={lead.need_vendor ? 'Yes' : 'No'} />
          <LeadDetailRow label="Preferred date" value={preferredDate ?? '—'} />
          <LeadDetailRow label="Preferred day" value={lead.preferred_day || '—'} />
          <LeadDetailRow label="Preferred slot" value={lead.preferred_time_slot || '—'} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'services',
      label: `Services (${lead.services_offered.length})`,
      icon: <HandymanIcon fontSize="small" />,
      render: () => (
        <Stack spacing={2.5}>
          <LeadDetailCard title="Website" icon={<LanguageIcon color="primary" />}>
            {lead.website ? (
              <ExternalLink variant="body2" href={lead.website} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No website on record.
              </Typography>
            )}
          </LeadDetailCard>
          <LeadDetailCard
            title="Services offered"
            subtitle={
              lead.services_offered.length
                ? `${lead.services_offered.length} service${lead.services_offered.length === 1 ? '' : 's'} tagged`
                : 'Catalogue managed via Manage Host Services'
            }
            icon={<HandymanIcon color="primary" />}
          >
            <ServicesGrid services={lead.services_offered} />
          </LeadDetailCard>
        </Stack>
      ),
    },

    {
      value: 'custom-fields',
      label: 'Custom Fields',
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard
          title="Custom fields"
          subtitle="Admin-defined fields from Settings → Dynamic Fields."
        >
          <DynamicValuesView entity="HOST_LEAD" json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'manual-logs',
      label: 'Manual Logs',
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <ManualLogsTab entityType="HOST_LEAD" entityId={lead.id} activities={lead.activity_log} />
      ),
    },

    {
      value: 'communications',
      label: 'Communications',
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType="HOST_LEAD" entityId={lead.id} />,
    },
  ];

  return (
    <Stack spacing={2.5}>
      {/* Back action above the title (per design spec). */}
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/host-leads')} size="small">
          Back to Host Leads
        </Button>
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
              <Avatar
                src={lead.profile_photo_url}
                sx={{ width: 56, height: 56, bgcolor: 'action.hover' }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                {lead.host_name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                <StatusChip value={lead.lead_status} />
                <PriorityChip value={lead.priority} />
                {lead.city && <Chip size="small" icon={<LocationOnIcon fontSize="small" />} label={lead.city} variant="outlined" />}
                {lead.host_type && <Chip size="small" label={lead.host_type} variant="outlined" />}
                {lead.super_category?.name && (
                  <Chip size="small" color="primary" label={lead.super_category.name} variant="outlined" />
                )}
                {(lead.interests ?? []).slice(0, 2).map((t) => (
                  <Chip key={t} size="small" label={t} variant="outlined" />
                ))}
                {(lead.interests?.length ?? 0) > 2 && (
                  <Chip size="small" label={`+${(lead.interests?.length ?? 0) - 2} more`} variant="outlined" />
                )}
              </Stack>
              {lead.tags.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mt: 1 }}
                  flexWrap="wrap"
                  useFlexGap
                  data-testid="host-tags"
                >
                  {lead.tags.map((t) => (
                    <Chip key={t} size="small" label={`#${t}`} variant="outlined" />
                  ))}
                </Stack>
              )}
            </Box>
            <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/host-leads/${lead.id}`)}>
              Edit
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label="Audience"
          value={lead.expected_audience_size || '—'}
          hint={lead.frequency ? lead.frequency : 'Frequency not set'}
          icon={<GroupsIcon fontSize="small" />}
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
          label="Community"
          value={lead.community_size ?? '—'}
          hint={
            lead.previous_events_hosted
              ? `Past events: ${lead.past_attendees ?? '—'} attendees`
              : 'No past events recorded'
          }
          icon={<EventIcon fontSize="small" />}
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

      <LeadTabs tabs={tabs} data-testid="host-lead-tabs" />
    </Stack>
  );
}
