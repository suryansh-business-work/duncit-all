import { z } from 'zod';
import { requiredText } from '@duncit/forms';
import type { CampaignVariable } from '../queries';

/** Email is the only channel; WhatsApp campaigns were removed. */
export type CampaignChannel = 'EMAIL';
export type CampaignAudience = 'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS' | 'AUDIENCE_LIST';

/** A saved Target Audience list, offered as a campaign audience. */
export interface CampaignAudienceList {
  id: string;
  name: string;
  member_count: number;
}
const defaultMjml = `<mjml>
  <mj-body background-color="#f8fafc">
    <mj-section padding="28px 20px 8px">
      <mj-column>
        <mj-text font-size="26px" line-height="34px" font-weight="700" color="#111827">{{app_name}} update</mj-text>
        <mj-text font-size="16px" line-height="24px" color="#4b5563">{t('marketing.marketingCampaigns.hereIsSomethingNewForYou')}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

/** Marketing campaign contract — RHF + Zod (migrated from Formik + Yup). */
export const marketingCampaignSchema = z.object({
    name: requiredText('Campaign name', 3, 120),
    channel: z.enum(['EMAIL'], { error: 'Channel is required' }),
    audience: z.enum(['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS', 'AUDIENCE_LIST'], {
      error: 'Audience is required',
    }),
    audience_list_id: z.string().trim().default(''),
    subject: requiredText('Subject', 3, 180),
    mjml: z
      .string()
      .trim()
      .min(20, 'MJML must be at least 20 characters')
      .refine((value) => /<mjml[\s>]/i.test(value), 'MJML must include an <mjml> root element'),
    scheduled_at: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => !value || !Number.isNaN(new Date(value).getTime()),
        'Schedule must be a valid date and time',
      ),
});

export type MarketingCampaignFormValues = z.infer<typeof marketingCampaignSchema>;

export function blankMarketingCampaignValues(channel: CampaignChannel = 'EMAIL'): MarketingCampaignFormValues {
  return {
    name: '',
    channel,
    audience: 'ALL_USERS',
    audience_list_id: '',
    subject: '',
    mjml: defaultMjml,
    scheduled_at: '',
  };
}

/**
 * Whether the draft holds anything worth losing. A campaign starts with the
 * default MJML already in the editor, so an untouched draft is not "empty" —
 * it is equal to the blank values, which is what this compares against.
 */
export function isCampaignDraftDirty(values: MarketingCampaignFormValues): boolean {
  const blank = blankMarketingCampaignValues(values.channel);
  return (Object.keys(blank) as (keyof MarketingCampaignFormValues)[]).some(
    (key) => values[key] !== blank[key],
  );
}

export function toMarketingCampaignInput(values: MarketingCampaignFormValues) {
  const cast = marketingCampaignSchema.parse(values);
  return {
    name: cast.name,
    channel: cast.channel,
    audience: cast.audience,
    audience_list_id: cast.audience === 'AUDIENCE_LIST' ? cast.audience_list_id : undefined,
    subject: cast.subject,
    mjml: cast.mjml,
    scheduled_at: cast.scheduled_at || undefined,
    send_now: !cast.scheduled_at,
  };
}

export interface MarketingCampaignFormProps {
  initialValues: MarketingCampaignFormValues;
  /** Saved audience lists, each with the number of people it reaches now. */
  audienceLists: CampaignAudienceList[];
  /** Placeholders the renderer substitutes, shown under the editor. */
  variables: CampaignVariable[];
  /** Placeholders written in the draft that the renderer does not know. */
  unknownVariables: string[];
  busy: boolean;
  previewLoading: boolean;
  errorMessage?: string | null;
  onValuesChange: (values: MarketingCampaignFormValues) => void;
  onSubmit: (values: MarketingCampaignFormValues) => Promise<void> | void;
}
