import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ContactsIcon from '@mui/icons-material/Contacts';
import EventIcon from '@mui/icons-material/Event';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { VENUE_LEAD } from '../../api/crm.gql';
import type { VenueLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import CommsLogsSection from '../../components/CommsLogsSection';
import { parseApiError } from '../../utils/parseApiError';

const joinList = (values?: string[] | null) => (values && values.length ? values.join(', ') : '—');

export default function VenueLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ venueLead: VenueLead | null }>(VENUE_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.venueLead;

  if (loading && !lead) {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;
  }
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!lead) return <Alert severity="info">Venue lead not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/venue-leads')} size="small">
          Venue Leads
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} noWrap>{lead.venue_name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <StatusChip value={lead.lead_status} />
            <PriorityChip value={lead.priority} />
            <Chip size="small" label={lead.city} variant="outlined" />
          </Stack>
        </Box>
        <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/venue-leads/${lead.id}`)}>
          Edit
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <LeadDetailCard title="Venue details" subtitle="Capacity, type and description" icon={<HomeWorkIcon color="primary" />}>
            <LeadDetailRow label="Types" value={joinList(lead.venue_types)} />
            <LeadDetailRow label="Space" value={lead.space_type || '—'} />
            <LeadDetailRow label="Capacity" value={`${lead.capacity_min ?? '?'} – ${lead.capacity_max ?? '?'}`} />
            <LeadDetailRow label="Description" value={lead.venue_description || '—'} />
          </LeadDetailCard>

          <LeadDetailCard title="Location" icon={<LocationOnIcon color="primary" />}>
            <LeadDetailRow label="City" value={lead.city} />
            <LeadDetailRow label="Area" value={lead.area || '—'} />
            <LeadDetailRow label="Address" value={lead.full_address} />
            <LeadDetailRow label="Landmark" value={lead.landmark || '—'} />
            <LeadDetailRow
              label="Map"
              value={
                lead.map_link ? (
                  <Typography component="a" href={lead.map_link} target="_blank" rel="noreferrer" variant="body2" sx={{ color: 'primary.main' }}>
                    {lead.map_link}
                  </Typography>
                ) : '—'
              }
            />
          </LeadDetailCard>

          <LeadDetailCard title="Availability & suitability" icon={<EventIcon color="primary" />}>
            <LeadDetailRow label="Days" value={joinList(lead.available_days)} />
            <LeadDetailRow label="Time slots" value={lead.available_time_slots || '—'} />
            <LeadDetailRow label="Booking notice" value={lead.booking_notice || '—'} />
            <LeadDetailRow label="Suitable for" value={joinList(lead.event_suitability)} />
            <LeadDetailRow label="Amenities" value={joinList(lead.amenities)} />
          </LeadDetailCard>

          <LeadDetailCard title="Commercial" icon={<CurrencyRupeeIcon color="primary" />}>
            <LeadDetailRow label="Pricing models" value={joinList(lead.pricing_models)} />
            <LeadDetailRow label="Expected charges" value={lead.expected_charges ? `₹ ${lead.expected_charges}` : '—'} />
            <LeadDetailRow label="Security deposit" value={lead.security_deposit ? `₹ ${lead.security_deposit}` : '—'} />
            <LeadDetailRow label="GST" value={lead.gst_applicable ? 'Applicable' : 'No'} />
            <LeadDetailRow label="Invoice" value={lead.invoice_available ? 'Available' : 'No'} />
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
              {lead.remarks && <LeadDetailRow label="Remarks" value={lead.remarks} />}
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <CommsLogsSection entityType="VENUE_LEAD" entityId={lead.id} />
    </Stack>
  );
}
