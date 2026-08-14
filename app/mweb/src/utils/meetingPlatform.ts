import { meetingPlatformName } from '@duncit/utils';
import { fallbackT, type Translate } from '../i18n/fallback';

/**
 * Maps a meeting-platform code (e.g. GOOGLE_MEET) to a human label.
 *
 * The name table itself lives in `@duncit/utils` — it was duplicated here and
 * in the native app, and the create-pod dropdown would have made a third copy.
 * What stays local is the only part that is copy rather than a product name:
 * the stand-in shown when a pod names no platform at all.
 *
 * `t` comes from the rendering screen so that stand-in follows the reader's
 * language; the bundled English is the default for call sites without one.
 */
export const formatMeetingPlatform = (value?: string | null, t: Translate = fallbackT): string => {
  if (!value) return t('mweb.podDetails.online');
  // An explicit "Other" is a choice the host made, so it is named as one — it
  // used to render as "Online", which reads as "we do not know".
  if (value === 'OTHER') return t('mweb.createPod.meetingPlatformOther');
  return meetingPlatformName(value);
};
