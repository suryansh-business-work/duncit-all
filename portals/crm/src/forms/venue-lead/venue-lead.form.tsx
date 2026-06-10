import { useState } from 'react';
import { Form, Formik } from 'formik';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { flattenErrors } from '../flattenErrors';
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
import VenueServicesSection from './sections/VenueServicesSection';
import VenueLinkedHostsSection from './sections/VenueLinkedHostsSection';
import VenueBrandingSection from './sections/VenueBrandingSection';
import VenueDynamicSection from './sections/VenueDynamicSection';
import VenueTrackingSection from './sections/VenueTrackingSection';
import type { CrmOptionGroup } from '../../api/crm.types';

interface Props {
  config: CrmOptionGroup;
  initialValues?: VenueLeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: VenueLeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const SECTIONS = [
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
  { title: '10. Services Offered', paths: ['services_offered'] },
  { title: '11. Linked Host Leads', paths: ['linked_host_ids'] },
  { title: '12. Logo & Tags', paths: ['logo_url', 'tags'] },
  { title: '13. Custom Fields', paths: ['dynamic_values_json'] },
  {
    title: '14. Internal Lead Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'remarks'],
  },
];

export default function VenueLeadForm({ config, initialValues, submitting, submitLabel = 'Save venue lead', onSubmit, onCancel }: Readonly<Props>) {
  return (
    <Formik
      initialValues={initialValues ?? venueLeadInitialValues}
      validationSchema={venueLeadSchema}
      validateOnChange
      validateOnBlur
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          await onSubmit(values);
        } catch (error: any) {
          setStatus(error?.message ?? 'Something went wrong');
        }
      }}
    >
      {({ status, errors, submitCount, isValid }) => {
        const flat = submitCount > 0 ? flattenErrors(errors) : [];
        return (
          <Form noValidate>
            <Stack spacing={1.25}>
              {status && <Alert severity="error">{status}</Alert>}
              {flat.length > 0 && (
                <Alert severity="error">
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
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
                {onCancel && (
                  <Button onClick={onCancel} disabled={submitting}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="contained" disabled={submitting || (submitCount > 0 && !isValid)}>
                  {submitting ? 'Saving…' : submitLabel}
                </Button>
              </Stack>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
}

function VenueSections({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const [signal, setSignal] = useState(0);
  const [signalValue, setSignalValue] = useState(true);
  const toggleAll = (open: boolean) => {
    setSignalValue(open);
    setSignal((s) => s + 1);
  };
  const components = [
    <VenueDetailsSection config={config} />,
    <VenueLocationSection />,
    <VenueContactsSection />,
    <VenueSuitabilitySection config={config} />,
    <VenueAvailabilitySection config={config} />,
    <VenueCommercialSection config={config} />,
    <VenueAmenitiesSection config={config} />,
    <VenueMediaSection />,
    <VenueWebsiteSection />,
    <VenueServicesSection />,
    <VenueLinkedHostsSection />,
    <VenueBrandingSection />,
    <VenueDynamicSection />,
    <VenueTrackingSection config={config} />,
  ];
  return (
    <>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={() => toggleAll(true)}>
          Expand all
        </Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={() => toggleAll(false)}>
          Collapse all
        </Button>
      </Stack>
      {SECTIONS.map((section, idx) => (
        <FormAccordion
          key={section.title}
          title={section.title}
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
