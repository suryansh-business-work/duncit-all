import { Form, Formik } from 'formik';
import { Alert, Button, Stack } from '@mui/material';
import FormAccordion from '../../components/FormAccordion';
import { hostLeadSchema } from './host-lead.schema';
import { hostLeadInitialValues, type HostLeadFormValues } from './host-lead.types';
import HostBasicSection from './sections/HostBasicSection';
import HostContactsSection from './sections/HostContactsSection';
import HostPreferencesSection from './sections/HostPreferencesSection';
import HostBudgetSection from './sections/HostBudgetSection';
import HostTimelineSection from './sections/HostTimelineSection';
import HostReachSection from './sections/HostReachSection';
import HostTrackingSection from './sections/HostTrackingSection';
import type { CrmOptionGroup } from '../../api/crm.types';

interface Props {
  config: CrmOptionGroup;
  initialValues?: HostLeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: HostLeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export default function HostLeadForm({ config, initialValues, submitting, submitLabel = 'Save host lead', onSubmit, onCancel }: Props) {
  return (
    <Formik
      initialValues={initialValues ?? hostLeadInitialValues}
      validationSchema={hostLeadSchema}
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
            <FormAccordion title="1. Basic Details" defaultExpanded><HostBasicSection config={config} /></FormAccordion>
            <FormAccordion title="2. Contact Details"><HostContactsSection /></FormAccordion>
            <FormAccordion title="3. Event Preferences"><HostPreferencesSection config={config} /></FormAccordion>
            <FormAccordion title="4. Budget & Revenue"><HostBudgetSection config={config} /></FormAccordion>
            <FormAccordion title="5. Timeline"><HostTimelineSection config={config} /></FormAccordion>
            <FormAccordion title="6. Social / Reach"><HostReachSection /></FormAccordion>
            <FormAccordion title="7. Internal Tracking"><HostTrackingSection config={config} /></FormAccordion>
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
