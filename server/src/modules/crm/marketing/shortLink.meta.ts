import { GraphQLError } from 'graphql';
import { isNonPublicHost } from '@utils/public-host';
import type { MetaOverride } from './shortLink.preview';

/**
 * The link-preview override a marketer can force on a short link.
 *
 * TWIN: the console's Zod schema in portals/marketing/src/pages/short-links-page/
 * short-link-form/short-link.types.tsx states the same limits so the marketer
 * is told before submitting; this is the rule that actually holds.
 */

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 300;
const MAX_IMAGE_URL = 2048;

export interface StoredMetaOverride {
  meta_override_enabled: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_image_url: string | null;
}

/** Switched off: nothing forced, the card is read from the destination. */
export const NO_META_OVERRIDE: StoredMetaOverride = {
  meta_override_enabled: false,
  meta_title: null,
  meta_description: null,
  meta_image_url: null,
};

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** Blank is "not forced", stored as null so `??` falls through to the destination. */
function blankToNull(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function checkLength(value: string | null, max: number, field: string) {
  if (value && value.length > max) throw bad(`Keep the preview ${field} to ${max} characters or fewer`);
}

/** The image an unfurler will download, so the same public-https rule as a destination. */
function checkImage(value: string | null) {
  if (!value) return;
  checkLength(value, MAX_IMAGE_URL, 'image link');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw bad('The preview image has to be a full https:// link');
  }
  if (url.protocol !== 'https:' || isNonPublicHost(url.hostname.toLowerCase())) {
    throw bad('The preview image has to be a full https:// link on a public site');
  }
}

/**
 * What to store for the override a request sent. Switched off clears every
 * field, so turning it back on later never resurrects a card written for a
 * destination the link may no longer point at.
 */
export function metaOverrideFrom(input: MetaOverride): StoredMetaOverride {
  if (!input.meta_override_enabled) return NO_META_OVERRIDE;
  const override = {
    meta_override_enabled: true,
    meta_title: blankToNull(input.meta_title),
    meta_description: blankToNull(input.meta_description),
    meta_image_url: blankToNull(input.meta_image_url),
  };
  if (!override.meta_title) throw bad('Give the preview a title, or switch the override off');
  checkLength(override.meta_title, MAX_TITLE, 'title');
  checkLength(override.meta_description, MAX_DESCRIPTION, 'description');
  checkImage(override.meta_image_url);
  return override;
}
