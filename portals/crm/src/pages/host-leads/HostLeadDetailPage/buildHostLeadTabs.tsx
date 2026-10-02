import ContactsIcon from '@mui/icons-material/Contacts';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { HostLead } from '../../../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from '../../../components/LeadDetailCard';
import ContactsTab from '../../../components/contacts-tab';
import type { LeadTab } from '../../../components/LeadTabs';
import ServicesGrid from '../../../components/ServicesGrid';
import CommsLogsSection from '../../../components/CommsLogsSection';
import ManualLogsTab from '../../../components/ManualLogsTab';
import WebsitePagesTab from '../../../components/website-pages-tab';
import RemindersTab from '../../../components/reminders-tab';
import LeadSurveyTab from '../../../components/lead-survey/LeadSurveyTab';
import DynamicValuesView from '../../../components/DynamicValuesView';
import { joinList, type leadDate, type TranslateFn } from './helpers';
import HostOverviewTab from './HostOverviewTab';

interface BuildArgs {
  lead: HostLead;
  t: TranslateFn;
  followUpLabel: string;
  preferredDate: ReturnType<typeof leadDate>;
  servicesPlural: string;
}

/** Tab definitions for the host lead detail page. */
export function buildHostLeadTabs({ lead, t, followUpLabel, preferredDate, servicesPlural }: BuildArgs): LeadTab[] {
  return [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <GroupsIcon fontSize="small" />,
      render: () => <HostOverviewTab lead={lead} t={t} followUpLabel={followUpLabel} />,
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
}
