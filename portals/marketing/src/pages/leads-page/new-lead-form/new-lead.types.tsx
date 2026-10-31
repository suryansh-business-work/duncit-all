import { z } from 'zod';
import { EMAIL, PHONE_INTL_PLUS, SOCIAL_HANDLE, isHostname } from '@duncit/regex';
import type { Translate } from '@duncit/shell';
import { LEAD_LIMITS } from '../copy';
import type { MarketingLeadInput, MarketingLeadPipeline, MarketingLeadSource, MarketingLeadStage } from '../queries';

export interface NewLeadFormValues {
  name: string;
  company: string;
  pipeline: MarketingLeadPipeline;
  source: MarketingLeadSource;
  stage: MarketingLeadStage;
  email: string;
  phone: string;
  website: string;
  instagram_handle: string;
  city: string;
}

export const blankNewLeadValues = (): NewLeadFormValues => ({
  name: '',
  company: '',
  pipeline: 'GENERAL',
  source: 'MANUAL',
  stage: 'NEW',
  email: '',
  phone: '',
  website: '',
  instagram_handle: '',
  city: '',
});

const PIPELINE_VALUES = ['VENUE', 'HOST', 'BRAND', 'INFLUENCER', 'ADVERTISER', 'GENERAL'] as const;
const SOURCE_VALUES = ['INSTAGRAM', 'GOOGLE_PLACES', 'WEB_SEARCH', 'IMPORT', 'MANUAL'] as const;
const STAGE_VALUES = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

/** Spaces, brackets and dashes a person types into a number are not part of it. */
export const phoneDigits = (value: string) => value.replaceAll(/[\s()-]/g, '');

const isWebsite = (value: string): boolean => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return isHostname(url.hostname);
  } catch {
    return false;
  }
};

/** Blank passes; otherwise the value must satisfy the check. */
const optional = (check: (value: string) => boolean, message: string) =>
  z.string().trim().refine((value) => value === '' || check(value), message);

export const newLeadSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('marketing.leads.nameRequired'))
      .max(LEAD_LIMITS.name, t('marketing.leads.tooLong', { vars: { max: LEAD_LIMITS.name } })),
    company: z.string().trim().max(LEAD_LIMITS.company, t('marketing.leads.tooLong', { vars: { max: LEAD_LIMITS.company } })),
    pipeline: z.enum(PIPELINE_VALUES),
    source: z.enum(SOURCE_VALUES),
    stage: z.enum(STAGE_VALUES),
    email: optional((value) => EMAIL.test(value), t('marketing.leads.emailInvalid')),
    phone: optional((value) => PHONE_INTL_PLUS.test(phoneDigits(value)), t('marketing.leads.phoneInvalid')),
    website: optional(isWebsite, t('marketing.leads.websiteInvalid')).refine(
      (value) => value.length <= LEAD_LIMITS.website,
      t('marketing.leads.websiteInvalid'),
    ),
    instagram_handle: optional((value) => SOCIAL_HANDLE.test(value.replace(/^@/, '')), t('marketing.leads.handleInvalid')),
    city: z.string().trim().max(LEAD_LIMITS.city, t('marketing.leads.tooLong', { vars: { max: LEAD_LIMITS.city } })),
  });

/** The form's values as the server takes them: one email and one phone become lists. */
export const toLeadInput = (values: NewLeadFormValues): MarketingLeadInput => ({
  name: values.name,
  company: values.company,
  pipeline: values.pipeline,
  source: values.source,
  stage: values.stage,
  emails: values.email ? [values.email] : [],
  phones: values.phone ? [phoneDigits(values.phone)] : [],
  website: values.website,
  instagram_handle: values.instagram_handle.replace(/^@/, ''),
  city: values.city,
});

export interface NewLeadFormProps {
  busy: boolean;
  /** True when the lead was saved — only then is the form reset. */
  onSubmit: (values: NewLeadFormValues) => Promise<boolean>;
  onCancel: () => void;
}
