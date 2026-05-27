import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
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
import EventIcon from '@mui/icons-material/Event';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import { VENUE_LEAD } from '../../api/crm.gql';
import type { VenueLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import LeadStatTile from '../../components/LeadStatTile';
import ServicesGrid from '../../components/ServicesGrid';
import CommsLogsSection from '../../components/CommsLogsSection';
import { parseApiError } from '../../utils/parseApiError';

const joinList = (values?: string[] | null) => (values && values.length ? values.join(', ') : '—');

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCapacity = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min} – ${max}`;
  return String(min ?? max ?? '—');
};

export default function VenueLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ venueLead: VenueLead | null }>(VENUE_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.venueLead;

  if (loading && !lead) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!lead) return <Alert severity="info">Venue lead not found.</Alert>;

  const followUpLabel = formatDate(lead.next_follow_up_date) ?? '—';

  return (
    <Stack spacing={2}>
      {/* ---- Header card ---- */}
      <Card
        sx={(t) => ({
          background: `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${alpha(
            t.palette.background.paper,
            1
          )} 60%)`,
        })}
      >
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap flexWrap="wrap">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/venue-leads')}
              size="small"
              sx={{ mt: 0.5 }}
            >
              Venue Leads
            </Button>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                {lead.venue_name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1 }}
                flexWrap="wrap"
                useFlexGap
              >
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
                  <Chip
                    size="small"
                    color="primary"
                    label={lead.super_category.name}
                    variant="outlined"
                  />
                )}
                {(lead.venue_types ?? []).slice(0, 2).map((t) => (
                  <Chip key={t} size="small" label={t} variant="outlined" />
                ))}
                {(lead.venue_types?.length ?? 0) > 2 && (
                  <Chip
                    size="small"
                    label={`+${(lead.venue_types?.length ?? 0) - 2} more`}
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
            <Button
              startIcon={<EditIcon />}
              variant="contained"
              onClick={() => navigate(`/venue-leads/${lead.id}`)}
            >
              Edit
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- Stat tiles ---- */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label="Capacity"
          value={formatCapacity(lead.capacity_min, lead.capacity_max)}
          hint={lead.space_type ? lead.space_type : 'Indoor / outdoor not set'}
          icon={<GroupsIcon fontSize="small" />}
          accent="primary"
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
          label="Expected charges"
          value={lead.expected_charges ? `₹${lead.expected_charges.toLocaleString()}` : '—'}
          hint={lead.security_deposit ? `Deposit ₹${lead.security_deposit.toLocaleString()}` : 'No deposit set'}
          icon={<CurrencyRupeeIcon fontSize="small" />}
          accent="success"
        />
        <LeadStatTile
          label="Next follow-up"
          value={followUpLabel}
          hint={lead.assigned_to ? `Assigned to ${lead.assigned_to}` : 'Unassigned'}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      {/* ---- Main columns ---- */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <LeadDetailCard
            title="Venue details"
            subtitle="Capacity, type and description"
            icon={<HomeWorkIcon color="primary" />}
          >
            <LeadDetailRow label="Super category" value={lead.super_category?.name || '—'} />
            <LeadDetailRow label="Types" value={joinList(lead.venue_types)} />
            <LeadDetailRow label="Space" value={lead.space_type || '—'} />
            <LeadDetailRow
              label="Capacity"
              value={formatCapacity(lead.capacity_min, lead.capacity_max)}
            />
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
                  <Typography
                    component="a"
                    href={lead.map_link}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                    sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    Open in Maps <OpenInNewIcon fontSize="inherit" />
                  </Typography>
                ) : (
                  '—'
                )
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
            <LeadDetailRow
              label="Expected charges"
              value={lead.expected_charges ? `₹ ${lead.expected_charges}` : '—'}
            />
            <LeadDetailRow
              label="Security deposit"
              value={lead.security_deposit ? `₹ ${lead.security_deposit}` : '—'}
            />
            <LeadDetailRow label="GST" value={lead.gst_applicable ? 'Applicable' : 'No'} />
            <LeadDetailRow label="Invoice" value={lead.invoice_available ? 'Available' : 'No'} />
          </LeadDetailCard>

          <LeadDetailCard title="Website" icon={<LanguageIcon color="primary" />}>
            {lead.website ? (
              <Typography
                component="a"
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                {lead.website} <OpenInNewIcon fontSize="inherit" />
              </Typography>
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
                : 'Catalogue managed via Manage Venue Services'
            }
            icon={<HandymanIcon color="primary" />}
          >
            <ServicesGrid services={lead.services_offered} />
          </LeadDetailCard>
        </Stack>

        <Stack spacing={2} sx={{ width: { lg: 360 }, flexShrink: 0 }}>
          <LeadDetailCard
            title="Contacts"
            subtitle={`${lead.contacts.length} contact${lead.contacts.length === 1 ? '' : 's'}`}
            icon={<ContactsIcon color="primary" />}
          >
            <Stack spacing={1.25}>
              {lead.contacts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No contacts yet.
                </Typography>
              )}
              {lead.contacts.map((contact, idx) => (
                <Card key={`${contact.email}-${idx}`} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
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
                  {(contact.mobile_number || contact.whatsapp_number || contact.email) && (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
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
                            rel="noreferrer"
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
                          <Typography
                            component="a"
                            href={`mailto:${contact.email}`}
                            variant="body2"
                            sx={{ color: 'text.primary', textDecoration: 'none', wordBreak: 'break-all' }}
                          >
                            {contact.email}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Card>
              ))}
            </Stack>
          </LeadDetailCard>

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
              <LeadDetailRow
                label="Created"
                value={lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'}
              />
              <LeadDetailRow
                label="Updated"
                value={lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '—'}
              />
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

      <CommsLogsSection entityType="VENUE_LEAD" entityId={lead.id} />
    </Stack>
  );
}
