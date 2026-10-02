import type { NavigateFunction } from 'react-router';
import ContactsIcon from '@mui/icons-material/Contacts';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LanguageIcon from '@mui/icons-material/Language';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import LinkIcon from '@mui/icons-material/Link';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { VenueLead } from '../../../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from '../../../components/LeadDetailCard';
import ContactsTab from '../../../components/contacts-tab';
import type { LeadTab } from '../../../components/LeadTabs';
import ServicesGrid from '../../../components/ServicesGrid';
import CommsLogsSection from '../../../components/CommsLogsSection';
import ManualLogsTab from '../../../components/ManualLogsTab';
import WebsitePagesTab from '../../../components/website-pages-tab';
import RemindersTab from '../../../components/reminders-tab';
import DynamicValuesView from '../../../components/DynamicValuesView';
import LeadSurveyTab from '../../../components/lead-survey/LeadSurveyTab';
import { joinList, type TranslateFn } from './helpers';
import VenueOverviewTab from './VenueOverviewTab';
import VenueLinkedHostsTab from './VenueLinkedHostsTab';

interface BuildArgs {
  lead: VenueLead;
  t: TranslateFn;
  navigate: NavigateFunction;
  followUpLabel: string;
  servicesPlural: string;
}

/** Tab definitions for the venue lead detail page. */
export function buildVenueLeadTabs({ lead, t, navigate, followUpLabel, servicesPlural }: BuildArgs): LeadTab[] {
  return [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <HomeWorkIcon fontSize="small" />,
      render: () => <VenueOverviewTab lead={lead} t={t} followUpLabel={followUpLabel} />,
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
      icon: <LinkIcon sx={{
        fontSize: "small"
      }} />,
      render: () => <VenueLinkedHostsTab lead={lead} t={t} navigate={navigate} />,
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
}
