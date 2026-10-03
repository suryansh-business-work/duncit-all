import { z } from 'zod';
import { requiredText } from '@duncit/forms';
import type { CampaignChoice, ShortLinkOptions, ShortLinkRow } from '../queries';
import { fallbackT, type Translate } from '@duncit/shell';
import { isAllowedDestination, isAllowedExternalDestination } from './short-link-destination';
import {
  blankMetaOverride,
  metaOverrideShape,
  refineMetaOverride,
  toMetaOverrideInput,
} from './short-link-meta';

export { isAllowedDestination, isAllowedExternalDestination } from './short-link-destination';

const EXTERNAL_MESSAGE =
  'Use a full https:// link to a public site — a Duncit address belongs on the Short Links page';
const FIRST_PARTY_MESSAGE = 'Use a full https:// link to a Duncit site or an app store listing';

export const shortLinkSchema = (t: Translate = fallbackT, external = false) =>
  z
  .object({
    label: requiredText('Label', 3, 120),
    destination_url: z
      .string()
      .trim()
      .min(1, 'Destination is required')
      .refine(
        external ? isAllowedExternalDestination : isAllowedDestination,
        external ? EXTERNAL_MESSAGE : FIRST_PARTY_MESSAGE,
      ),
    source: z.string().min(1, 'Pick where this link is going'),
    source_other: z.string().trim().default(''),
    medium: z.string().min(1, 'Pick a medium'),
    medium_other: z.string().trim().default(''),
    campaign_id: z.string().trim().default(''),
    ...metaOverrideShape,
  })
  .superRefine((values, ctx) => {
    refineMetaOverride(values, ctx, t);
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
    ...blankMetaOverride(),
  };
}

/** An existing link as the edit form starts it. */
export function shortLinkValuesFrom(link: ShortLinkRow): ShortLinkFormValues {
  return {
    label: link.label,
    destination_url: link.destination_url,
    source: link.source,
    source_other: link.source_other ?? '',
    medium: link.medium,
    medium_other: link.medium_other ?? '',
    campaign_id: link.campaign_id ?? '',
    meta_override_enabled: link.meta_override_enabled,
    meta_title: link.meta_title ?? '',
    meta_description: link.meta_description ?? '',
    meta_image_url: link.meta_image_url ?? '',
  };
}

export function toShortLinkInput(values: ShortLinkFormValues, external = false) {
  // Re-parsed under the SAME rule the form validated with: parsing an external
  // destination against the first-party rule would throw on a link the form
  // just accepted.
  const cast = shortLinkSchema(fallbackT, external).parse(values);
  return {
    label: cast.label,
    destination_url: cast.destination_url,
    source: cast.source,
    source_other: cast.source === 'OTHER' ? cast.source_other : undefined,
    medium: cast.medium,
    medium_other: cast.medium === 'OTHER' ? cast.medium_other : undefined,
    campaign_id: cast.campaign_id || undefined,
    ...toMetaOverrideInput(cast),
  };
}

/** What an edit sends: the utm tags stay as the link went out with them. */
export function toShortLinkUpdateInput(values: ShortLinkFormValues, external = false) {
  const cast = shortLinkSchema(fallbackT, external).parse(values);
  return {
    label: cast.label,
    destination_url: cast.destination_url,
    ...toMetaOverrideInput(cast),
  };
}

export interface ShortLinkFormProps {
  /**
   * The channel, medium and campaign pickers. Left out when editing: a link
   * keeps the utm tags it went out with, so there is nothing to pick.
   */
  utm?: { options: ShortLinkOptions; campaigns: CampaignChoice[] };
  /** The link being edited; omitted when creating one. */
  initialValues?: ShortLinkFormValues;
  /** A share link follows the thing it was minted for — no hand-picked destination. */
  lockDestination?: boolean;
  submitLabel: string;
  busy: boolean;
  errorMessage?: string | null;
  /** Validate and describe the destination as a non-Duncit URL. */
  external?: boolean;
  onCancel: () => void;
  onSubmit: (values: ShortLinkFormValues) => Promise<void> | void;
}
