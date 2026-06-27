import { z } from 'zod';
import { requiredText } from '../../../forms/validation/zodRules';
import type { CampaignPreviewCard } from '../queries';

export type CampaignChannel = 'EMAIL' | 'WHATSAPP';
export type CampaignAudience = 'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS';
export type CampaignCardType = '' | 'POD' | 'CLUB';

const defaultMjml = `<mjml>
  <mj-body background-color="#f8fafc">
    <mj-section padding="28px 20px 8px">
      <mj-column>
        <mj-text font-size="26px" line-height="34px" font-weight="700" color="#111827">{{app_name}} update</mj-text>
        <mj-text font-size="16px" line-height="24px" color="#4b5563">Here is something new for you.</mj-text>
      </mj-column>
    </mj-section>
    {{content_card}}
  </mj-body>
</mjml>`;

/**
 * Marketing campaign contract — RHF + Zod (migrated from Formik + Yup).
 * `superRefine` reproduces the old yup `.when('card_type')` rule: a card item
 * is required only once a card type is selected.
 */
export const marketingCampaignSchema = z
  .object({
    name: requiredText('Campaign name', 3, 120),
    channel: z.enum(['EMAIL', 'WHATSAPP'], { required_error: 'Channel is required' }),
    audience: z.enum(['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS'], { required_error: 'Audience is required' }),
    subject: requiredText('Subject', 3, 180),
    mjml: z
      .string()
      .trim()
      .min(20, 'MJML must be at least 20 characters')
      .refine((value) => /<mjml[\s>]/i.test(value), 'MJML must include an <mjml> root element'),
    card_type: z.enum(['', 'POD', 'CLUB']).default(''),
    card_ref_id: z.string().trim().default(''),
    scheduled_at: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => !value || !Number.isNaN(new Date(value).getTime()),
        'Schedule must be a valid date and time',
      ),
  })
  .superRefine((values, ctx) => {
    if (values.card_type && !values.card_ref_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['card_ref_id'],
        message: 'Select a card',
      });
    }
  });

export type MarketingCampaignFormValues = z.infer<typeof marketingCampaignSchema>;

export function blankMarketingCampaignValues(channel: CampaignChannel = 'EMAIL'): MarketingCampaignFormValues {
  return {
    name: '',
    channel,
    audience: 'ALL_USERS',
    subject: '',
    mjml: defaultMjml,
    card_type: '',
    card_ref_id: '',
    scheduled_at: '',
  };
}

export function toMarketingCampaignInput(values: MarketingCampaignFormValues) {
  const cast = marketingCampaignSchema.parse(values);
  return {
    name: cast.name,
    channel: cast.channel,
    audience: cast.audience,
    subject: cast.subject,
    mjml: cast.mjml,
    card_type: cast.card_type || undefined,
    card_ref_id: cast.card_ref_id || undefined,
    scheduled_at: cast.scheduled_at || undefined,
    send_now: !cast.scheduled_at,
  };
}

export interface MarketingCampaignFormProps {
  initialValues: MarketingCampaignFormValues;
  cards: CampaignPreviewCard[];
  busy: boolean;
  previewLoading: boolean;
  errorMessage?: string | null;
  onValuesChange: (values: MarketingCampaignFormValues) => void;
  onSubmit: (values: MarketingCampaignFormValues) => Promise<void> | void;
}
