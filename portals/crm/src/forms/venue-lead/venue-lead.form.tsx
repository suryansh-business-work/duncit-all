import { useMemo, useState } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, Box, Stack, Typography } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { DuncitButton } from '@duncit/buttons';
import { flattenErrors } from '../flattenErrors';
import { useLeadFormSubmit } from '../useLeadFormSubmit';
import LeadFormActions from '../../components/LeadFormActions';
import LeadDuplicateCheck from '../../components/lead-duplicates/LeadDuplicateCheck';
import FormAccordion from '../../components/FormAccordion';
import { venueLeadSchema } from './venue-lead.schema';
import { venueLeadInitialValues, type VenueLeadFormValues } from './venue-lead.types';
import VenueDetailsSection from './sections/VenueDetailsSection';
import VenueLocationSection from './sections/VenueLocationSection';
import VenueContactsSection from './sections/VenueContactsSection';
import VenueSuitabilitySection from './sections/VenueSuitabilitySection';
import VenueAvailabilitySection from './sections/VenueAvailabilitySection';
import VenueCommercialSection from './sections/VenueCommercialSection';
import VenueAmenitiesSection from './sections/VenueAmenitiesSection';
import VenueMediaSection from './sections/VenueMediaSection';
import VenueWebsiteSection from './sections/VenueWebsiteSection';
import LeadSocialSection from '../fields/LeadSocialSection';
import LeadServicesSection from '../fields/LeadServicesSection';
import VenueLinkedHostsSection from './sections/VenueLinkedHostsSection';
import VenueBrandingSection from './sections/VenueBrandingSection';
import VenueDynamicSection from './sections/VenueDynamicSection';
import VenueTrackingSection from './sections/VenueTrackingSection';
import type { CrmOptionGroup } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { withSocialLinks } from '../validation/socialLinks';

interface Props {
  config: CrmOptionGroup;
  initialValues?: VenueLeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: VenueLeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
  /** Save without leaving the form ("Update & Continue"). */
  onSubmitAndContinue?: (values: VenueLeadFormValues) => Promise<void> | void;
  continueLabel?: string;
  /** The lead being edited, so the duplicate check never matches it; absent on a new lead. */
  leadId?: string;
}

const SECTIONS: Array<{ title: string; titleKey?: string; expanded?: boolean; paths: string[] }> = [
  {
    title: '1. Venue Details',
    expanded: true,
    paths: ['super_category_id', 'venue_name', 'venue_types', 'venue_description', 'capacity_min', 'capacity_max', 'space_type'],
  },
  { title: '2. Location', paths: ['city', 'area', 'full_address', 'landmark', 'map_link'] },
  { title: '3. Contacts', paths: ['contacts'] },
  { title: '4. Event Suitability', paths: ['event_suitability'] },
  { title: '5. Availability', paths: ['available_days', 'available_time_slots', 'booking_notice'] },
  {
    title: '6. Commercial',
    paths: ['pricing_models', 'expected_charges', 'security_deposit', 'gst_applicable', 'invoice_available'],
  },
  { title: '7. Amenities', paths: ['amenities'] },
  { title: '8. Media', paths: ['photos', 'videos', 'brochure_url'] },
  { title: '9. Website', paths: ['website'] },
  { title: '10.', titleKey: 'crm.common.social', paths: ['instagram_link', 'social_links'] },
  { title: '11. Services Offered', paths: ['services_offered'] },
  { title: '12. Linked Host Leads', paths: ['linked_host_ids'] },
  { title: '13. Logo & Tags', paths: ['logo_url', 'tags'] },
  { title: '14. Custom Fields', paths: ['dynamic_values_json'] },
  {
    title: '15. Internal Lead Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'remarks'],
  },
];

export default function VenueLeadForm({
  config,
  initialValues,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  onSubmitAndContinue,
  continueLabel,
  leadId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const submitLabelText = submitLabel ?? t('crm.forms.saveVenueLead');

  const schema = useMemo(() => withSocialLinks(venueLeadSchema, t, true), [t]);

  const methods = useForm<VenueLeadFormValues, any, VenueLeadFormValues>({
    resolver: zodResolver(schema, undefined, { raw: true }) as unknown as Resolver<VenueLeadFormValues, any, VenueLeadFormValues>,
    mode: 'onChange',
    defaultValues: initialValues ?? venueLeadInitialValues,
  });
  const { errors, submitCount, isValid } = methods.formState;
  const flat = submitCount > 0 ? flattenErrors(errors) : [];

  const { status, continuing, handle, handleContinue } = useLeadFormSubmit(methods, onSubmit, onSubmitAndContinue);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handle} noValidate>
        <Stack spacing={1.25}>
          {status && <Alert severity="error" data-testid="lead-form-status">{status}</Alert>}
          {flat.length > 0 && (
            <Alert severity="error" data-testid="lead-form-errors">
              <AlertTitle>
                {flat.length} {flat.length === 1 ? 'field has' : 'fields have'} validation errors
              </AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                {flat.map((entry) => (
                  <li key={entry.path}>
                    <Typography component="span" sx={{ fontWeight: 700 }}>{entry.label}:</Typography>{' '}
                    <Typography component="span" variant="body2">{entry.message}</Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}
          <VenueSections config={config} />
          <LeadDuplicateCheck entityType="VENUE_LEAD" leadId={leadId} />
          <LeadFormActions
            submitLabel={submitLabelText}
            submitting={submitting}
            continuing={continuing}
            invalid={submitCount > 0 && !isValid}
            continueLabel={continueLabel}
            onContinue={handleContinue}
            onCancel={onCancel}
          />
        </Stack>
      </form>
    </FormProvider>
  );
}

function VenueSections({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  const [signal, setSignal] = useState(0);
  const [signalValue, setSignalValue] = useState(true);
  const toggleAll = (open: boolean) => {
    setSignalValue(open);
    setSignal((s) => s + 1);
  };
  const components = [
    <VenueDetailsSection key="details" config={config} />,
    <VenueLocationSection key="location" />,
    <VenueContactsSection key="contacts" />,
    <VenueSuitabilitySection key="suitability" config={config} />,
    <VenueAvailabilitySection key="availability" config={config} />,
    <VenueCommercialSection key="commercial" config={config} />,
    <VenueAmenitiesSection key="amenities" config={config} />,
    <VenueMediaSection key="media" />,
    <VenueWebsiteSection key="website" />,
    <LeadSocialSection key="social" />,
    <LeadServicesSection key="services" appliesTo="VENUE" />,
    <VenueLinkedHostsSection key="linked-hosts" />,
    <VenueBrandingSection key="branding" />,
    <VenueDynamicSection key="dynamic" />,
    <VenueTrackingSection key="tracking" config={config} />,
  ];
  return (
    <>
      <Stack direction="row" spacing={1} sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitButton size="small" startIcon={<UnfoldMoreIcon />} onClick={() => toggleAll(true)}>
          Expand all
        </DuncitButton>
        <DuncitButton size="small" startIcon={<UnfoldLessIcon />} onClick={() => toggleAll(false)}>
          Collapse all
        </DuncitButton>
      </Stack>
      {SECTIONS.map((section, idx) => (
        <FormAccordion
          key={section.title}
          title={section.titleKey ? `${section.title} ${t(section.titleKey)}` : section.title}
          defaultExpanded={section.expanded}
          fieldPaths={section.paths}
          expandSignal={signal}
          expandSignalValue={signalValue}
        >
          {components[idx]}
        </FormAccordion>
      ))}
    </>
  );
}
