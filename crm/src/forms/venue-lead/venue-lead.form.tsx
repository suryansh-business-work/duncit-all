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

export default function VenueLeadForm({ config, initialValues, submitting, submitLabel = 'Save venue lead', onSubmit, onCancel }: Props) {
  return (
    <Formik
      initialValues={initialValues ?? venueLeadInitialValues}
      validationSchema={venueLeadSchema}
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          await onSubmit(values);
        } catch (error: any) {
          setStatus(error?.message ?? 'Something went wrong');
        }
      }}
    >
      {({ status }) => (
        <Form noValidate>
          <Stack spacing={1.25}>
            {status && <Alert severity="error">{status}</Alert>}
            <FormAccordion title="1. Venue Details" defaultExpanded><VenueDetailsSection config={config} /></FormAccordion>
            <FormAccordion title="2. Location"><VenueLocationSection /></FormAccordion>
            <FormAccordion title="3. Contacts"><VenueContactsSection /></FormAccordion>
            <FormAccordion title="4. Event Suitability"><VenueSuitabilitySection config={config} /></FormAccordion>
            <FormAccordion title="5. Availability"><VenueAvailabilitySection config={config} /></FormAccordion>
            <FormAccordion title="6. Commercial"><VenueCommercialSection config={config} /></FormAccordion>
            <FormAccordion title="7. Amenities"><VenueAmenitiesSection config={config} /></FormAccordion>
            <FormAccordion title="8. Media"><VenueMediaSection /></FormAccordion>
            <FormAccordion title="9. Internal Lead Tracking"><VenueTrackingSection config={config} /></FormAccordion>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              {onCancel && <Button onClick={onCancel} disabled={submitting}>Cancel</Button>}
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Saving…' : submitLabel}
              </Button>
            </Stack>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
