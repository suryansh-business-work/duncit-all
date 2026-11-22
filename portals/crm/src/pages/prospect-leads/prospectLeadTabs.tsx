import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import ContactsIcon from '@mui/icons-material/Contacts';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import TuneIcon from '@mui/icons-material/Tune';
import { formatDate, formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { ProspectLeadEntity } from '../../api/crm.types';
import type { ProspectLead } from '../../api/prospectLeads.types';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import ContactsTab from '../../components/contacts-tab';
import CommsLogsSection from '../../components/CommsLogsSection';
import ManualLogsTab from '../../components/ManualLogsTab';
import { remindersTab } from '../../components/reminders-tab/remindersTab';
import ExternalLink from '../../components/ExternalLink';
import DynamicValuesView from '../../components/DynamicValuesView';
import type { LeadTab } from '../../components/LeadTabs';
import { leadServicesTab } from '../../components/leadServicesTab';
import { leadSocialTab } from '../../components/leadSocialTab';
import { leadMediaTab } from '../../components/lead-media/leadMediaTab';
import { profileRows } from './prospectDetails';

type Translate = ReturnType<typeof useTranslation>['t'];
const DASH = '—';

function TrackingCard({ lead }: Readonly<{ lead: ProspectLead }>) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <StickyNote2Icon color="primary" />
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t('crm.prospectLeads.leadTracking')}
          </Typography>
        </Stack>
        <LeadDetailRow label={t('crm.common.source')} value={lead.lead_source || DASH} />
        <LeadDetailRow label={t('crm.common.assignedTo')} value={lead.assigned_to || DASH} />
        <LeadDetailRow label={t('crm.common.nextFollowUp')} value={formatDate(lead.next_follow_up_date) || DASH} />
        <Divider sx={{ my: 1 }} />
        <LeadDetailRow label={t('shell.common.created')} value={lead.created_at ? formatDateTime(lead.created_at) : DASH} />
        <LeadDetailRow label={t('shell.common.updated')} value={lead.updated_at ? formatDateTime(lead.updated_at) : DASH} />
        {lead.notes && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4 }}>
              {t('crm.prospectLeads.notes')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
              {lead.notes}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ lead }: Readonly<{ lead: ProspectLead }>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <LeadDetailCard title={t('crm.prospectLeads.profile')} icon={<PersonPinIcon color="primary" />}>
          {profileRows(lead, t).map((row) => (
            <LeadDetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </LeadDetailCard>
        <LeadDetailCard title={t('crm.common.location')} icon={<LocationOnIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.city')} value={lead.city || DASH} />
          <LeadDetailRow label={t('crm.common.area')} value={lead.area || DASH} />
        </LeadDetailCard>
        <LeadDetailCard title={t('crm.prospectLeads.onlinePresence')} icon={<LanguageIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.website')} value={lead.website ? <ExternalLink variant="body2" href={lead.website} /> : DASH} />
        </LeadDetailCard>
      </Stack>
      <Stack spacing={2.5} sx={{ width: { lg: 360 }, flexShrink: 0 }}>
        <TrackingCard lead={lead} />
      </Stack>
    </Stack>
  );
}

/** Tab definitions for a creator / community lead detail page. */
export function buildProspectLeadTabs(
  entity: ProspectLeadEntity,
  lead: ProspectLead,
  displayName: string,
  t: Translate
): LeadTab[] {
  return [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <PersonPinIcon fontSize="small" />,
      render: () => <OverviewTab lead={lead} />,
    },
    {
      value: 'contacts',
      label: t('crm.prospectLeads.contactsCount', { count: lead.contacts.length }),
      icon: <ContactsIcon fontSize="small" />,
      render: () => <ContactsTab entity={entity} leadId={lead.id} leadName={displayName} contacts={lead.contacts} />,
    },
    leadSocialTab(lead, t),
    leadServicesTab(lead.services_offered ?? [], t),
    leadMediaTab(entity, lead.id, t),
    {
      value: 'custom-fields',
      label: t('crm.common.customFields2'),
      icon: <TuneIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard title={t('crm.common.customFields')} subtitle={t('crm.common.adminDefinedFieldsFromSettingsDynamic')}>
          <DynamicValuesView entity={entity} json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },
    remindersTab(entity, lead.id, t),
    {
      value: 'manual-logs',
      label: t('crm.common.manualLogs'),
      icon: <EventNoteIcon fontSize="small" />,
      render: () => <ManualLogsTab entityType={entity} entityId={lead.id} activities={lead.activity_log} />,
    },
    {
      value: 'communications',
      label: t('crm.common.communications'),
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType={entity} entityId={lead.id} />,
    },
  ];
}
