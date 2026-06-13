import { Form, Formik } from 'formik';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { flattenErrors } from '../flattenErrors';
import FormAccordion from '../../components/FormAccordion';
import { ecommLeadSchema } from './ecomm-lead.schema';
import { ecommLeadInitialValues, type EcommLeadFormValues } from './ecomm-lead.types';
import EcommBasicSection from './sections/EcommBasicSection';
import EcommContactsSection from './sections/EcommContactsSection';
import EcommCatalogSection from './sections/EcommCatalogSection';
import EcommPresenceSection from './sections/EcommPresenceSection';
import EcommServicesSection from './sections/EcommServicesSection';
import EcommBrandingSection from './sections/EcommBrandingSection';
import EcommTrackingSection from './sections/EcommTrackingSection';
import type { CrmOptionGroup } from '../../api/crm.types';

interface Props {
  config: CrmOptionGroup;
  initialValues?: EcommLeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: EcommLeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const SECTIONS = [
  { title: '1. Basic Details', expanded: true, paths: ['super_category_id', 'seller_name', 'brand_name', 'business_type', 'city', 'area'] },
  { title: '2. Contact Details', paths: ['contacts'] },
  { title: '3. Products & Catalogue', paths: ['product_categories', 'catalog_size', 'price_range', 'fulfilment_mode', 'monthly_orders'] },
  { title: '4. Tax & Online Presence', paths: ['gst_number', 'gst_applicable', 'website', 'instagram_link', 'marketplace_links'] },
  { title: '5. Services Offered', paths: ['services_offered'] },
  { title: '6. Photo, Tags & Custom Fields', paths: ['profile_photo_url', 'tags', 'dynamic_values_json'] },
  {
    title: '7. Internal Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'notes'],
  },
];

export default function EcommLeadForm({ config, initialValues, submitting, submitLabel = 'Save ecomm lead', onSubmit, onCancel }: Readonly<Props>) {
  return (
    <Formik
      initialValues={initialValues ?? ecommLeadInitialValues}
      validationSchema={ecommLeadSchema}
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
              <EcommSections config={config} />
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

function EcommSections({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const components = [
    <EcommBasicSection key="basic" />,
    <EcommContactsSection key="contacts" />,
    <EcommCatalogSection key="catalog" />,
    <EcommPresenceSection key="presence" />,
    <EcommServicesSection key="services" />,
    <EcommBrandingSection key="branding" />,
    <EcommTrackingSection key="tracking" config={config} />,
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
