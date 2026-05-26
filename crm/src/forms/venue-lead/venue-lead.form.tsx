import { Form, Formik } from 'formik';
import { Alert, Button, Stack } from '@mui/material';
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
    paths: ['venue_name', 'venue_types', 'venue_description', 'capacity_min', 'capacity_max', 'space_type'],
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
  {
    title: '9. Internal Lead Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'remarks'],
  },
];

export default function VenueLeadForm({ config, initialValues, submitting, submitLabel = 'Save venue lead', onSubmit, onCancel }: Props) {
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
        const totalErrors = submitCount > 0 ? Object.keys(errors).length : 0;
        return (
          <Form noValidate>
            <Stack spacing={1.25}>
              {status && <Alert severity="error">{status}</Alert>}
              {totalErrors > 0 && (
                <Alert severity="error">
                  Please fix the highlighted sections — {totalErrors} {totalErrors === 1 ? 'field has' : 'fields have'} validation errors.
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

function VenueSections({ config }: { config: CrmOptionGroup }) {
  const components = [
    <VenueDetailsSection config={config} />,
    <VenueLocationSection />,
    <VenueContactsSection />,
    <VenueSuitabilitySection config={config} />,
    <VenueAvailabilitySection config={config} />,
    <VenueCommercialSection config={config} />,
    <VenueAmenitiesSection config={config} />,
    <VenueMediaSection />,
    <VenueTrackingSection config={config} />,
  ];
  return (
    <>
      {SECTIONS.map((section, idx) => (
        <FormAccordion
          key={section.title}
          title={section.title}
          defaultExpanded={section.expanded}
          fieldPaths={section.paths}
        >
          {components[idx]}
        </FormAccordion>
      ))}
    </>
  );
}
