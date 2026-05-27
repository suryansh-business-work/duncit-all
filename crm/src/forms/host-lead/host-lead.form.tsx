import { Form, Formik } from 'formik';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { flattenErrors } from '../flattenErrors';
import FormAccordion from '../../components/FormAccordion';
import { hostLeadSchema } from './host-lead.schema';
import { hostLeadInitialValues, type HostLeadFormValues } from './host-lead.types';
import HostBasicSection from './sections/HostBasicSection';
import HostContactsSection from './sections/HostContactsSection';
import HostPreferencesSection from './sections/HostPreferencesSection';
import HostBudgetSection from './sections/HostBudgetSection';
import HostTimelineSection from './sections/HostTimelineSection';
import HostReachSection from './sections/HostReachSection';
import HostWebsiteSection from './sections/HostWebsiteSection';
import HostServicesSection from './sections/HostServicesSection';
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

const SECTIONS = [
  { title: '1. Basic Details', expanded: true, paths: ['super_category_id', 'host_name', 'host_type', 'organization_name', 'city', 'area'] },
  { title: '2. Contact Details', paths: ['contacts'] },
  {
    title: '3. Event Preferences',
    paths: ['interests', 'expected_audience_size', 'frequency', 'need_venue', 'need_vendor'],
  },
  { title: '4. Budget & Revenue', paths: ['budget_range', 'revenue_models'] },
  { title: '5. Timeline', paths: ['preferred_event_date', 'preferred_day', 'preferred_time_slot'] },
  {
    title: '6. Social / Reach',
    paths: [
      'instagram_link',
      'community_link',
      'community_size',
      'previous_events_hosted',
      'past_attendees',
      'host_intent_scores',
    ],
  },
  { title: '7. Website', paths: ['website'] },
  { title: '8. Services Offered', paths: ['services_offered'] },
  {
    title: '9. Internal Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'notes'],
  },
];

export default function HostLeadForm({ config, initialValues, submitting, submitLabel = 'Save host lead', onSubmit, onCancel }: Props) {
  return (
    <Formik
      initialValues={initialValues ?? hostLeadInitialValues}
      validationSchema={hostLeadSchema}
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
              <HostSections config={config} />
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

function HostSections({ config }: { config: CrmOptionGroup }) {
  const components = [
    <HostBasicSection config={config} />,
    <HostContactsSection />,
    <HostPreferencesSection config={config} />,
    <HostBudgetSection config={config} />,
    <HostTimelineSection config={config} />,
    <HostReachSection />,
    <HostWebsiteSection />,
    <HostServicesSection config={config} />,
    <HostTrackingSection config={config} />,
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
