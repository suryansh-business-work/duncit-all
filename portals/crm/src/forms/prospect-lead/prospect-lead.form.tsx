import type { ReactNode } from 'react';
import { FormProvider, useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { flattenErrors } from '../flattenErrors';
import { useLeadFormSubmit } from '../useLeadFormSubmit';
import LeadFormActions from '../../components/LeadFormActions';
import LeadDuplicateCheck from '../../components/lead-duplicates/LeadDuplicateCheck';
import FormAccordion from '../../components/FormAccordion';
import EcommTrackingSection from '../ecomm-lead/sections/EcommTrackingSection';
import ContactsField from '../fields/ContactsField';
import type { CrmOptionGroup, ProspectLeadEntity } from '../../api/crm.types';
import { communityLeadSchema, creatorLeadSchema } from './prospect-lead.schema';
import CreatorProfileSection from './sections/CreatorProfileSection';
import CreatorReachSection from './sections/CreatorReachSection';
import CommunityProfileSection from './sections/CommunityProfileSection';
import CommunityDetailsSection from './sections/CommunityDetailsSection';
import ProspectPresenceSection from './sections/ProspectPresenceSection';
import ProspectBrandingSection from './sections/ProspectBrandingSection';
import LeadServicesSection from '../fields/LeadServicesSection';
import LeadSocialSection from '../fields/LeadSocialSection';

interface Props<T extends FieldValues> {
  entity: ProspectLeadEntity;
  config: CrmOptionGroup;
  initialValues: T;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: T) => Promise<void> | void;
  onCancel?: () => void;
  /** Save without leaving the form ("Update & Continue"). */
  onSubmitAndContinue?: (values: T) => Promise<void> | void;
  continueLabel?: string;
  /** The lead being edited, so the duplicate check never matches it; absent on a new lead. */
  leadId?: string;
}

interface Section {
  titleKey: string;
  paths: string[];
  render: () => ReactNode;
}

const TRACKING_PATHS = ['lead_source', 'assigned_to', 'lead_status', 'priority', 'next_follow_up_date', 'notes'];
const BRANDING_PATHS = ['profile_photo_url', 'tags', 'dynamic_values_json'];

function sectionsFor(entity: ProspectLeadEntity, config: CrmOptionGroup): Section[] {
  const creator = entity === 'CREATOR_LEAD';
  return [
    creator
      ? {
          titleKey: 'crm.prospectLeads.sectionProfile',
          paths: ['super_category_id', 'creator_name', 'handle', 'primary_platform', 'city', 'area'],
          render: () => <CreatorProfileSection config={config} />,
        }
      : {
          titleKey: 'crm.prospectLeads.sectionProfile',
          paths: ['super_category_id', 'community_name', 'community_type', 'platform', 'community_link', 'city', 'area'],
          render: () => <CommunityProfileSection config={config} />,
        },
    { titleKey: 'crm.prospectLeads.sectionContacts', paths: ['contacts'], render: () => <ContactsField name="contacts" /> },
    creator
      ? {
          titleKey: 'crm.creatorLeads.sectionReach',
          paths: ['niches', 'followers_count', 'engagement_rate', 'profile_links', 'collaboration_types', 'rate_card'],
          render: () => <CreatorReachSection config={config} />,
        }
      : {
          titleKey: 'crm.communityLeads.sectionDetails',
          paths: ['member_count', 'meetup_frequency', 'interests', 'partnership_interests'],
          render: () => <CommunityDetailsSection config={config} />,
        },
    { titleKey: 'crm.common.website', paths: ['website'], render: () => <ProspectPresenceSection /> },
    { titleKey: 'crm.common.social', paths: ['instagram_link', 'social_links'], render: () => <LeadSocialSection /> },
    {
      titleKey: 'crm.common.servicesOffered',
      paths: ['services_offered'],
      render: () => <LeadServicesSection appliesTo={creator ? 'CREATOR' : 'COMMUNITY'} />,
    },
    { titleKey: 'crm.prospectLeads.sectionBranding', paths: BRANDING_PATHS, render: () => <ProspectBrandingSection entity={entity} /> },
    { titleKey: 'crm.prospectLeads.sectionTracking', paths: TRACKING_PATHS, render: () => <EcommTrackingSection config={config} /> },
  ];
}

/**
 * Creator / community lead form (React Hook Form + Zod). One form for both
 * kinds: `entity` picks the schema and the kind-specific sections; contacts,
 * presence, photo + custom fields and tracking are shared.
 */
export default function ProspectLeadForm<T extends FieldValues>({
  entity,
  config,
  initialValues,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  onSubmitAndContinue,
  continueLabel,
  leadId,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  // The two schemas have different shapes, so each gets its own resolver.
  const resolver =
    entity === 'CREATOR_LEAD'
      ? zodResolver(creatorLeadSchema(t), undefined, { raw: true })
      : zodResolver(communityLeadSchema(t), undefined, { raw: true });
  const methods = useForm<T, unknown, T>({
    resolver: resolver as unknown as Resolver<T, unknown, T>,
    mode: 'onChange',
    defaultValues: initialValues as DefaultValues<T>,
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
              <AlertTitle>{t('crm.prospectLeads.validationErrors', { count: flat.length })}</AlertTitle>
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
          {sectionsFor(entity, config).map((section, idx) => (
            <FormAccordion
              key={section.titleKey}
              title={t(section.titleKey)}
              defaultExpanded={idx === 0}
              fieldPaths={section.paths}
            >
              {section.render()}
            </FormAccordion>
          ))}
          <LeadDuplicateCheck entityType={entity} leadId={leadId} />
          <LeadFormActions
            submitLabel={submitLabel}
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
