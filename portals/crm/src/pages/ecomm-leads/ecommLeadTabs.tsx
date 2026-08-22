import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ContactsIcon from '@mui/icons-material/Contacts';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HandymanIcon from '@mui/icons-material/Handyman';
import LanguageIcon from '@mui/icons-material/Language';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ForumIcon from '@mui/icons-material/Forum';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { EcommLead } from '../../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from '../../components/LeadDetailCard';
import ContactsTab from '../../components/contacts-tab';
import ServicesGrid from '../../components/ServicesGrid';
import CommsLogsSection from '../../components/CommsLogsSection';
import ManualLogsTab from '../../components/ManualLogsTab';
import ExternalLink from '../../components/ExternalLink';
import LeadSurveyTab from '../../components/lead-survey/LeadSurveyTab';
import DynamicValuesView from '../../components/DynamicValuesView';
import type { LeadTab } from '../../components/LeadTabs';
import { formatDateTime, formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : '—');

const leadDate = (iso?: string | null) => adminDate(iso) || null;

function OverviewTab({ lead }: Readonly<{ lead: EcommLead }>) {
  const { t } = useTranslation();
  const followUpLabel = leadDate(lead.next_follow_up_date) ?? '—';
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <LeadDetailCard title={t('crm.ecommLeads.sellerDetails')} icon={<StorefrontIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.superCategory2')} value={lead.super_category?.name || '—'} />
          <LeadDetailRow label={t('crm.common.brand')} value={lead.brand_name || '—'} />
          <LeadDetailRow label={t('crm.ecommLeads.businessType')} value={lead.business_type || '—'} />
          <LeadDetailRow label={t('crm.common.productCategories')} value={joinList(lead.product_categories)} />
          <LeadDetailRow label={t('crm.ecommLeads.catalogueSize')} value={lead.catalog_size || '—'} />
          <LeadDetailRow label={t('crm.ecommLeads.priceRange')} value={lead.price_range || '—'} />
          <LeadDetailRow label={t('shell.nav.fulfilment')} value={lead.fulfilment_mode || '—'} />
          <LeadDetailRow label={t('crm.ecommLeads.monthlyOrders')} value={lead.monthly_orders || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title={t('crm.common.location')} icon={<LocationOnIcon color="primary" />}>
          <LeadDetailRow label={t('crm.common.city')} value={lead.city || '—'} />
          <LeadDetailRow label={t('crm.common.area')} value={lead.area || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title={t('crm.ecommLeads.taxAndOnlinePresence')} icon={<LanguageIcon color="primary" />}>
          <LeadDetailRow label={t('crm.ecommLeads.gstNumber')} value={lead.gst_number || '—'} />
          <LeadDetailRow label={t('crm.common.gstApplicable')} value={lead.gst_applicable ? 'Yes' : 'No'} />
          <LeadDetailRow
            label={t('crm.common.website')}
            value={lead.website ? <ExternalLink variant="body2" href={lead.website} /> : '—'}
          />
          <LeadDetailRow
            label={t('crm.common.instagram')}
            value={lead.instagram_link ? <ExternalLink variant="body2" href={lead.instagram_link} /> : '—'}
          />
          <LeadDetailRow label={t('crm.ecommLeads.marketplaces')} value={joinList(lead.marketplace_links)} />
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
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** Tab definitions for the ecomm lead detail page. */
export function buildEcommLeadTabs(lead: EcommLead, t: Translate): LeadTab[] {
  return [
    {
      value: 'overview',
      label: t('crm.common.overview'),
      icon: <StorefrontIcon fontSize="small" />,
      render: () => <OverviewTab lead={lead} />,
    },
    {
      value: 'contacts',
      label: `Contacts (${lead.contacts.length})`,
      icon: <ContactsIcon fontSize="small" />,
      render: () => (
        <ContactsTab entity="ECOMM_LEAD" leadId={lead.id} leadName={lead.seller_name} contacts={lead.contacts} />
      ),
    },
    {
      value: 'services',
      label: `Services (${lead.services_offered.length})`,
      icon: <HandymanIcon fontSize="small" />,
      render: () => {
        const serviceCount = lead.services_offered.length;
        const servicePlural = serviceCount === 1 ? '' : 's';
        const servicesSubtitle = serviceCount
          ? `${serviceCount} service${servicePlural} tagged`
          : 'Catalogue managed via Manage Ecomm Services';
        return (
        <LeadDetailCard
          title={t('crm.common.servicesOffered')}
          subtitle={servicesSubtitle}
          icon={<HandymanIcon color="primary" />}
        >
          <ServicesGrid services={lead.services_offered} />
        </LeadDetailCard>
        );
      },
    },
    {
      value: 'survey',
      label: t('crm.common.survey'),
      icon: <AssignmentIcon fontSize="small" />,
      render: () => <LeadSurveyTab entity="ECOMM_LEAD" leadId={lead.id} />,
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
          <DynamicValuesView entity="ECOMM_LEAD" json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },
    {
      value: 'manual-logs',
      label: t('crm.common.manualLogs'),
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <ManualLogsTab entityType="ECOMM_LEAD" entityId={lead.id} activities={lead.activity_log} />
      ),
    },
    {
      value: 'communications',
      label: t('crm.common.communications'),
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType="ECOMM_LEAD" entityId={lead.id} />,
    },
  ];
}
