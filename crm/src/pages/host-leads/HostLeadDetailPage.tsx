import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ContactsIcon from '@mui/icons-material/Contacts';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import { HOST_LEAD } from '../../api/crm.gql';
import type { HostLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import CommsLogsSection from '../../components/CommsLogsSection';
import { parseApiError } from '../../utils/parseApiError';

const joinList = (values?: string[] | null) => (values && values.length ? values.join(', ') : '—');

export default function HostLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ hostLead: HostLead | null }>(HOST_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.hostLead;

  if (loading && !lead) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!lead) return <Alert severity="info">Host lead not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/host-leads')} size="small">
          Host Leads
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} noWrap>{lead.host_name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <StatusChip value={lead.lead_status} />
            <PriorityChip value={lead.priority} />
            {lead.city && <Chip size="small" label={lead.city} variant="outlined" />}
            {lead.host_type && <Chip size="small" label={lead.host_type} variant="outlined" />}
          </Stack>
        </Box>
        <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/host-leads/${lead.id}`)}>
          Edit
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <LeadDetailCard title="Host details" icon={<GroupsIcon color="primary" />}>
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

          <LeadDetailCard title="Plans & timeline" icon={<EventIcon color="primary" />}>
            <LeadDetailRow label="Budget" value={lead.budget_range || '—'} />
            <LeadDetailRow label="Revenue models" value={joinList(lead.revenue_models)} />
            <LeadDetailRow label="Needs venue" value={lead.need_venue ? 'Yes' : 'No'} />
            <LeadDetailRow label="Needs vendor" value={lead.need_vendor ? 'Yes' : 'No'} />
            <LeadDetailRow
              label="Preferred date"
              value={lead.preferred_event_date ? new Date(lead.preferred_event_date).toLocaleDateString() : '—'}
            />
            <LeadDetailRow label="Preferred day" value={lead.preferred_day || '—'} />
            <LeadDetailRow label="Preferred slot" value={lead.preferred_time_slot || '—'} />
          </LeadDetailCard>

          <LeadDetailCard title="Social / Reach">
            <LeadDetailRow
              label="Instagram"
              value={lead.instagram_link ? (
                <Typography component="a" href={lead.instagram_link} target="_blank" rel="noreferrer" variant="body2" sx={{ color: 'primary.main' }}>
                  {lead.instagram_link}
                </Typography>
              ) : '—'}
            />
            <LeadDetailRow
              label="Community link"
              value={lead.community_link ? (
                <Typography component="a" href={lead.community_link} target="_blank" rel="noreferrer" variant="body2" sx={{ color: 'primary.main' }}>
                  {lead.community_link}
                </Typography>
              ) : '—'}
            />
            <LeadDetailRow label="Community size" value={lead.community_size ?? '—'} />
            <LeadDetailRow label="Previous events" value={lead.previous_events_hosted ? 'Yes' : 'No'} />
            <LeadDetailRow label="Past attendees" value={lead.past_attendees ?? '—'} />
            <LeadDetailRow label="Intent" value={joinList(lead.host_intent_scores)} />
          </LeadDetailCard>
        </Stack>

        <Stack spacing={2} sx={{ width: { lg: 360 }, flexShrink: 0 }}>
          <LeadDetailCard title="Contacts" subtitle={`${lead.contacts.length} contact${lead.contacts.length === 1 ? '' : 's'}`} icon={<ContactsIcon color="primary" />}>
            <Stack spacing={1.25}>
              {lead.contacts.length === 0 && <Typography variant="body2" color="text.secondary">No contacts yet.</Typography>}
              {lead.contacts.map((contact, idx) => (
                <Card key={`${contact.email}-${idx}`} variant="outlined" sx={{ p: 1.25 }}>
                  <Typography variant="subtitle2" fontWeight={700}>{contact.name || (idx === 0 ? 'Primary contact' : `Contact ${idx + 1}`)}</Typography>
                  {contact.role && <Typography variant="caption" color="text.secondary">{contact.role}</Typography>}
                  {contact.mobile_number && <Typography variant="body2">📱 {contact.mobile_number}</Typography>}
                  {contact.whatsapp_number && <Typography variant="body2">💬 {contact.whatsapp_number}</Typography>}
                  {contact.email && <Typography variant="body2">✉️ {contact.email}</Typography>}
                </Card>
              ))}
            </Stack>
          </LeadDetailCard>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Lead tracking</Typography>
              <LeadDetailRow label="Source" value={lead.lead_source || '—'} />
              <LeadDetailRow label="Assigned to" value={lead.assigned_to || '—'} />
              <LeadDetailRow label="Follow-up" value={lead.next_follow_up_date ? new Date(lead.next_follow_up_date).toLocaleDateString() : '—'} />
              <LeadDetailRow label="Created" value={lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'} />
              <LeadDetailRow label="Updated" value={lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '—'} />
              {lead.notes && <LeadDetailRow label="Notes" value={lead.notes} />}
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <CommsLogsSection entityType="HOST_LEAD" entityId={lead.id} />
    </Stack>
  );
}
