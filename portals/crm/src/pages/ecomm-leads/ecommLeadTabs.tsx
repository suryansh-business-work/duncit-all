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

const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : '—');

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

function OverviewTab({ lead }: Readonly<{ lead: EcommLead }>) {
  const followUpLabel = formatDate(lead.next_follow_up_date) ?? '—';
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <LeadDetailCard title="Seller details" icon={<StorefrontIcon color="primary" />}>
          <LeadDetailRow label="Super category" value={lead.super_category?.name || '—'} />
          <LeadDetailRow label="Brand" value={lead.brand_name || '—'} />
          <LeadDetailRow label="Business type" value={lead.business_type || '—'} />
          <LeadDetailRow label="Product categories" value={joinList(lead.product_categories)} />
          <LeadDetailRow label="Catalogue size" value={lead.catalog_size || '—'} />
          <LeadDetailRow label="Price range" value={lead.price_range || '—'} />
          <LeadDetailRow label="Fulfilment" value={lead.fulfilment_mode || '—'} />
          <LeadDetailRow label="Monthly orders" value={lead.monthly_orders || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title="Location" icon={<LocationOnIcon color="primary" />}>
          <LeadDetailRow label="City" value={lead.city || '—'} />
          <LeadDetailRow label="Area" value={lead.area || '—'} />
        </LeadDetailCard>

        <LeadDetailCard title="Tax & Online presence" icon={<LanguageIcon color="primary" />}>
          <LeadDetailRow label="GST number" value={lead.gst_number || '—'} />
          <LeadDetailRow label="GST applicable" value={lead.gst_applicable ? 'Yes' : 'No'} />
          <LeadDetailRow
            label="Website"
            value={lead.website ? <ExternalLink variant="body2" href={lead.website} /> : '—'}
          />
          <LeadDetailRow
            label="Instagram"
            value={lead.instagram_link ? <ExternalLink variant="body2" href={lead.instagram_link} /> : '—'}
          />
          <LeadDetailRow label="Marketplaces" value={joinList(lead.marketplace_links)} />
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
            <LeadDetailRow label="Source" value={lead.lead_source || '—'} />
            <LeadDetailRow label="Assigned to" value={lead.assigned_to || '—'} />
            <LeadDetailRow label="Follow-up" value={followUpLabel} />
            <Divider sx={{ my: 1 }} />
            <LeadDetailRow label="Created" value={lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'} />
            <LeadDetailRow label="Updated" value={lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '—'} />
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

/** Tab definitions for the ecomm lead detail page. */
export function buildEcommLeadTabs(lead: EcommLead): LeadTab[] {
  return [
    {
      value: 'overview',
      label: 'Overview',
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
          title="Services offered"
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
      label: 'Survey',
      icon: <AssignmentIcon fontSize="small" />,
      render: () => <LeadSurveyTab entity="ECOMM_LEAD" leadId={lead.id} />,
    },
    {
      value: 'custom-fields',
      label: 'Custom Fields',
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <LeadDetailCard
          title="Custom fields"
          subtitle="Admin-defined fields from Settings → Dynamic Fields."
        >
          <DynamicValuesView entity="ECOMM_LEAD" json={lead.dynamic_values_json} />
        </LeadDetailCard>
      ),
    },
    {
      value: 'manual-logs',
      label: 'Manual Logs',
      icon: <EventNoteIcon fontSize="small" />,
      render: () => (
        <ManualLogsTab entityType="ECOMM_LEAD" entityId={lead.id} activities={lead.activity_log} />
      ),
    },
    {
      value: 'communications',
      label: 'Communications',
      icon: <ForumIcon fontSize="small" />,
      render: () => <CommsLogsSection entityType="ECOMM_LEAD" entityId={lead.id} />,
    },
  ];
}
