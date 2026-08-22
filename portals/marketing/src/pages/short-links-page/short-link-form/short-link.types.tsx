import { z } from 'zod';
import { requiredText } from '@duncit/forms';
import type { CampaignChoice, ShortLinkOptions } from '../queries';
import { fallbackT, type Translate } from '@duncit/shell';

/**
 * A duncit.com short link may only point at our own properties or an app
 * store listing. The server enforces this too — this copy exists so the
 * marketer is told before they submit, not after.
 */
const ALLOWED_STORE_HOSTS = new Set(['play.google.com', 'apps.apple.com']);

export const isAllowedDestination = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname;
  return host === 'duncit.com' || host.endsWith('.duncit.com') || ALLOWED_STORE_HOSTS.has(host);
};

export const shortLinkSchema = (t: Translate = fallbackT) =>
  z
  .object({
    label: requiredText('Label', 3, 120),
    destination_url: z
      .string()
      .trim()
      .min(1, 'Destination is required')
      .refine(
        isAllowedDestination,
        'Use a full https:// link to a Duncit site or an app store listing',
      ),
    source: z.string().min(1, 'Pick where this link is going'),
    source_other: z.string().trim().default(''),
    medium: z.string().min(1, 'Pick a medium'),
    medium_other: z.string().trim().default(''),
    campaign_id: z.string().trim().default(''),
  })
  .superRefine((values, ctx) => {
    // An untagged link loses the attribution it was created for, so Other
    // without the text is refused rather than quietly shipped.
    if (values.source === 'OTHER' && !values.source_other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_other'],
        message: t('marketing.shortLinks.sayWhatTheChannelIs'),
      });
    }
    if (values.medium === 'OTHER' && !values.medium_other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medium_other'],
        message: t('marketing.shortLinks.sayWhatTheMediumIs'),
      });
    }
  });

export type ShortLinkFormValues = z.infer<ReturnType<typeof shortLinkSchema>>;

export function blankShortLinkValues(): ShortLinkFormValues {
  return {
    label: '',
    destination_url: '',
    source: '',
    source_other: '',
    medium: '',
    medium_other: '',
    campaign_id: '',
  };
}

export function toShortLinkInput(values: ShortLinkFormValues) {
  const cast = shortLinkSchema().parse(values);
  return {
    label: cast.label,
    destination_url: cast.destination_url,
    source: cast.source,
    source_other: cast.source === 'OTHER' ? cast.source_other : undefined,
    medium: cast.medium,
    medium_other: cast.medium === 'OTHER' ? cast.medium_other : undefined,
    campaign_id: cast.campaign_id || undefined,
  };
}

export interface ShortLinkFormProps {
  options: ShortLinkOptions;
  campaigns: CampaignChoice[];
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: ShortLinkFormValues) => Promise<void> | void;
}
