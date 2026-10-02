import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/**
 * The link-preview override a marketer can force on a short link.
 *
 * TWIN: server/src/modules/crm/marketing/shortLink.meta.ts owns the real rule
 * and refuses anything this misses. These copies exist so the marketer is told
 * before they submit, not after.
 */
export const META_TITLE_MAX = 120;
export const META_DESCRIPTION_MAX = 300;

export const metaOverrideShape = {
  meta_override_enabled: z.boolean().default(false),
  meta_title: z.string().trim().default(''),
  meta_description: z.string().trim().default(''),
  meta_image_url: z.string().trim().default(''),
};

export interface MetaOverrideValues {
  meta_override_enabled: boolean;
  meta_title: string;
  meta_description: string;
  meta_image_url: string;
}

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Only judged while the override is on — switched off, the fields are ignored. */
export function refineMetaOverride(values: MetaOverrideValues, ctx: z.RefinementCtx, t: Translate): void {
  if (!values.meta_override_enabled) return;
  const issue = (path: keyof MetaOverrideValues, key: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message: t(key) });
  if (!values.meta_title) issue('meta_title', 'marketing.shortLinks.previewTitleRequired');
  if (values.meta_title.length > META_TITLE_MAX) issue('meta_title', 'marketing.shortLinks.previewTitleTooLong');
  if (values.meta_description.length > META_DESCRIPTION_MAX) {
    issue('meta_description', 'marketing.shortLinks.previewDescriptionTooLong');
  }
  if (values.meta_image_url && !isHttpsUrl(values.meta_image_url)) {
    issue('meta_image_url', 'marketing.shortLinks.previewImageInvalid');
  }
}

export const blankMetaOverride = (): MetaOverrideValues => ({
  meta_override_enabled: false,
  meta_title: '',
  meta_description: '',
  meta_image_url: '',
});

/** A blank field is sent blank: the server stores it as "keep the destination's". */
export const toMetaOverrideInput = (values: MetaOverrideValues): MetaOverrideValues => ({
  meta_override_enabled: values.meta_override_enabled,
  meta_title: values.meta_title,
  meta_description: values.meta_description,
  meta_image_url: values.meta_image_url,
});
