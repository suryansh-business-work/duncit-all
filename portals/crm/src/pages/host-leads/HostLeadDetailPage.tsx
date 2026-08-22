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
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { HOST_LEAD } from '../../api/crm.gql';
import type { HostLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import LeadContactActions from '../../components/LeadContactActions';
import ContactsTab from '../../components/contacts-tab';
import LeadStatTile from '../../components/LeadStatTile';
import LeadTabs, { type LeadTab } from '../../components/LeadTabs';
import ServicesGrid from '../../components/ServicesGrid';
import CommsLogsSection from '../../components/CommsLogsSection';
import ManualLogsTab from '../../components/ManualLogsTab';
import ExternalLink from '../../components/ExternalLink';
import WebsitePagesTab from '../../components/website-pages-tab';
import RemindersTab from '../../components/reminders-tab';
import LeadSurveyTab from '../../components/lead-survey/LeadSurveyTab';
import MatchedUserBox, { MatchedUserChip } from '../../components/MatchedUserBox';
import AskAiDrawer, { ASK_AI_WIDTH } from '../../components/ask-ai/AskAiDrawer';
import DynamicValuesView from '../../components/DynamicValuesView';
import { hostVariableValues } from '../../config/leadVariables';
import { formatDateTime, formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : '—');

const leadDate = (iso?: string | null) => adminDate(iso) || null;

export default function HostLeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, loading, error } = useQuery<{ hostLead: HostLead | null }>(HOST_LEAD, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.hostLead;

  if ((loading && !lead) || error || !lead) {
    return (
      <QueryGuard loading={loading && !lead} error={error} notFound={!lead} notFoundText="Host lead not found." />
    );
  }

  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  const preferredDate = leadDate(lead.preferred_event_date);
  const servicesPlural = lead.services_offered.length === 1 ? '' : 's';

  const tabs: LeadTab[] = [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <GroupsIcon fontSize="small" />,
      render: () => (
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
        <ContactsTab entity="HOST_LEAD" leadId={lead.id} leadName={lead.host_name} contacts={lead.contacts} />
      ),
    },

    {
      value: 'plans',
      label: t('crm.hostLeads.plansAndTimeline2'),
      icon: <EventIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard title={t('crm.hostLeads.plansAndTimeline')} icon={<EventIcon color="primary" />}>
          <LeadDetailRow label={t('crm.hostLeads.budget')} value={lead.budget_range || '—'} />
          <LeadDetailRow label={t('crm.hostLeads.revenueModels')} value={joinList(lead.revenue_models)} />
          <LeadDetailRow label={t('crm.hostLeads.needsVenue')} value={lead.need_venue ? 'Yes' : 'No'} />
          <LeadDetailRow label={t('crm.hostLeads.needsVendor')} value={lead.need_vendor ? 'Yes' : 'No'} />
          <LeadDetailRow label={t('crm.hostLeads.preferredDate')} value={preferredDate ?? '—'} />
          <LeadDetailRow label={t('crm.hostLeads.preferredDay')} value={lead.preferred_day || '—'} />
          <LeadDetailRow label={t('crm.hostLeads.preferredSlot')} value={lead.preferred_time_slot || '—'} />
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
              : 'Catalogue managed via Manage Host Services'
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
      render: () => <LeadSurveyTab entity="HOST_LEAD" leadId={lead.id} />,
    },

    {
      value: 'website',
      label: t('crm.common.website'),
      icon: <LanguageIcon fontSize="small" />,
      render: () => <WebsitePagesTab entity="HOST_LEAD" leadId={lead.id} website={lead.website} />,
    },

    {
      value: 'reminders',
      label: t('shell.nav.reminders'),
      icon: <EventAvailableIcon fontSize="small" />,
      render: () => <RemindersTab entity="HOST_LEAD" leadId={lead.id} />,
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
          <DynamicValuesView entity="HOST_LEAD" json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },

    {
      value: 'manual-logs',
      label: t('crm.common.manualLogs'),
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <ManualLogsTab entityType="HOST_LEAD" entityId={lead.id} activities={lead.activity_log} />
      ),
    },

    {
      value: 'communications',
      label: t('crm.common.communications'),
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType="HOST_LEAD" entityId={lead.id} />,
    },
  ];

  return (
    <Stack spacing={2.5} sx={{ transition: 'margin 0.2s ease', mr: aiOpen ? { xs: 0, sm: `${ASK_AI_WIDTH}px` } : 0 }}>
      {/* Back action above the title (per design spec). */}
      <Box>
        <BackButton onClick={() => navigate('/host-leads')}>{t('crm.hostLeads.backToHostLeads')}</BackButton>
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
                {lead.matched_user && <MatchedUserChip matched={lead.matched_user} />}
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
              <LeadContactActions
                entity="HOST_LEAD"
                leadId={lead.id}
                displayName={lead.host_name}
                email={lead.contacts?.[0]?.email}
                mobile={lead.contacts?.[0]?.mobile_number}
                whatsapp={lead.contacts?.[0]?.whatsapp_number}
                variableValues={hostVariableValues(lead)}
              />
            </Box>
            <Button startIcon={<SmartToyIcon />} color="secondary" variant="outlined" onClick={() => setAiOpen(true)}>
              {t('crm.components.askAi')}
            </Button>
            <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/host-leads/${lead.id}`)}>
              {t('shell.common.edit')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {lead.matched_user && <MatchedUserBox matched={lead.matched_user} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <LeadStatTile
          label={t('crm.hostLeads.audience')}
          value={lead.expected_audience_size || '—'}
          hint={lead.frequency ? lead.frequency : 'Frequency not set'}
          icon={<GroupsIcon fontSize="small" />}
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
          label={t('crm.common.community')}
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
          label={t('crm.common.nextFollowUp')}
          value={followUpLabel}
          hint={lead.assigned_to ? `Assigned to ${lead.assigned_to}` : 'Unassigned'}
          icon={<EventAvailableIcon fontSize="small" />}
          accent="warning"
        />
      </Stack>

      <LeadTabs tabs={tabs} data-testid="host-lead-tabs" />

      <AskAiDrawer open={aiOpen} entity="HOST_LEAD" leadId={lead.id} leadName={lead.host_name} onClose={() => setAiOpen(false)} />
    </Stack>
  );
}
