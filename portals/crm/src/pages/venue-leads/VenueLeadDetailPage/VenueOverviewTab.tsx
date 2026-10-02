import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import type { VenueLead } from '../../../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from '../../../components/LeadDetailCard';
import MapEmbed from '../../../components/MapEmbed';
import { formatDateTime } from '@duncit/app-settings';
import { formatCapacity, joinList, type TranslateFn } from './helpers';

interface Props {
  lead: VenueLead;
  t: TranslateFn;
  followUpLabel: string;
}

export default function VenueOverviewTab({ lead, t, followUpLabel }: Readonly<Props>) {
  return (
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
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 1.25
              }}>
              <StickyNote2Icon color="primary" />
              <Typography component="h2" variant="subtitle1" sx={{
                fontWeight: 800
              }}>
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
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    letterSpacing: 0.4
                  }}>
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
  );
}
