import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import InstagramIcon from '@mui/icons-material/Instagram';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import type { HostLead } from '../../../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from '../../../components/LeadDetailCard';
import ExternalLink from '../../../components/ExternalLink';
import { formatDateTime } from '@duncit/app-settings';
import { joinList, type TranslateFn } from './helpers';

interface Props {
  lead: HostLead;
  t: TranslateFn;
  followUpLabel: string;
}

export default function HostOverviewTab({ lead, t, followUpLabel }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <LeadDetailCard title={t('crm.hostLeads.hostDetails')} icon={<GroupsIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.superCategory2')} value={lead.super_category?.name || '—'} />
          <LeadDetailRow label={t('shell.common.type')} value={lead.host_type || '—'} />
          <LeadDetailRow label={t('crm.hostLeads.organization')} value={lead.organization_name || '—'} />
          <LeadDetailRow label={t('crm.hostLeads.interests')} value={joinList(lead.interests)} />
          <LeadDetailRow label={t('crm.hostLeads.audienceSize')} value={lead.expected_audience_size || '—'} />
          <LeadDetailRow label={t('crm.common.frequency')} value={lead.frequency || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title={t('crm.common.location')} icon={<LocationOnIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.city')} value={lead.city || '—'} />
          <LeadDetailRow label={t('crm.common.area')} value={lead.area || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title={t('crm.hostLeads.socialReach')} icon={<InstagramIcon color="primary" />}>
          <LeadDetailRow
            label={t('crm.common.instagram')}
            value={lead.instagram_link ? <ExternalLink variant="body2" href={lead.instagram_link} /> : '—'}
          />
          <LeadDetailRow
            label={t('crm.hostLeads.communityLink')}
            value={lead.community_link ? <ExternalLink variant="body2" href={lead.community_link} /> : '—'}
          />
          <LeadDetailRow label={t('crm.hostLeads.communitySize')} value={lead.community_size ?? '—'} />
          <LeadDetailRow label={t('crm.hostLeads.previousEvents')} value={lead.previous_events_hosted ? 'Yes' : 'No'} />
          <LeadDetailRow label={t('crm.hostLeads.pastAttendees')} value={lead.past_attendees ?? '—'} />
          <LeadDetailRow label={t('crm.hostLeads.intent')} value={joinList(lead.host_intent_scores)} />
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
            {lead.notes && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    letterSpacing: 0.4
                  }}>
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
  );
}
