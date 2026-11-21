import { useMemo } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, Box, Stack, Typography } from '@mui/material';
import { flattenErrors } from '../flattenErrors';
import { useLeadFormSubmit } from '../useLeadFormSubmit';
import LeadFormActions from '../../components/LeadFormActions';
import FormAccordion from '../../components/FormAccordion';
import { ecommLeadSchema } from './ecomm-lead.schema';
import { ecommLeadInitialValues, type EcommLeadFormValues } from './ecomm-lead.types';
import EcommBasicSection from './sections/EcommBasicSection';
import EcommContactsSection from './sections/EcommContactsSection';
import EcommCatalogSection from './sections/EcommCatalogSection';
import EcommPresenceSection from './sections/EcommPresenceSection';
import LeadServicesSection from '../fields/LeadServicesSection';
import EcommBrandingSection from './sections/EcommBrandingSection';
import EcommTrackingSection from './sections/EcommTrackingSection';
import type { CrmOptionGroup } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { withSocialLinks } from '../validation/socialLinks';

interface Props {
  config: CrmOptionGroup;
  initialValues?: EcommLeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: EcommLeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
  /** Save without leaving the form ("Update & Continue"). */
  onSubmitAndContinue?: (values: EcommLeadFormValues) => Promise<void> | void;
  continueLabel?: string;
}

const SECTIONS = [
  { title: '1. Basic Details', expanded: true, paths: ['super_category_id', 'seller_name', 'brand_name', 'business_type', 'city', 'area'] },
  { title: '2. Contact Details', paths: ['contacts'] },
  { title: '3. Products & Catalogue', paths: ['product_categories', 'catalog_size', 'price_range', 'fulfilment_mode', 'monthly_orders'] },
  { title: '4. Tax & Online Presence', paths: ['gst_number', 'gst_applicable', 'website', 'instagram_link', 'social_links', 'marketplace_links'] },
  { title: '5. Services Offered', paths: ['services_offered'] },
  { title: '6. Photo, Tags & Custom Fields', paths: ['profile_photo_url', 'tags', 'dynamic_values_json'] },
  {
    title: '7. Internal Tracking',
    paths: ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'notes'],
  },
];

export default function EcommLeadForm({
  config,
  initialValues,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  onSubmitAndContinue,
  continueLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const submitLabelText = submitLabel ?? t('crm.forms.saveEcommLead');

  const schema = useMemo(() => withSocialLinks(ecommLeadSchema, t), [t]);

  const methods = useForm<EcommLeadFormValues, any, EcommLeadFormValues>({
    resolver: zodResolver(schema, undefined, { raw: true }) as unknown as Resolver<EcommLeadFormValues, any, EcommLeadFormValues>,
    mode: 'onChange',
    defaultValues: initialValues ?? ecommLeadInitialValues,
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
          <EcommSections config={config} />
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

function EcommSections({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const components = [
    <EcommBasicSection key="basic" />,
    <EcommContactsSection key="contacts" />,
    <EcommCatalogSection key="catalog" />,
    <EcommPresenceSection key="presence" />,
    <LeadServicesSection key="services" appliesTo="ECOMM" />,
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
