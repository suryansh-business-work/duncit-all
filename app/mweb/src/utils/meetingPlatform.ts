import { fallbackT, type Translate } from '../i18n/fallback';

// Product names, which are the same in every language — only "Online", the
// stand-in for a platform we have no name for, is copy.
const LABELS: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MICROSOFT_TEAMS: 'Microsoft Teams',
  TEAMS: 'Microsoft Teams',
  SKYPE: 'Skype',
  WEBEX: 'Webex',
};

/** Maps a meeting-platform enum (e.g. GOOGLE_MEET) to a human label. Falls back
 * to a title-cased version of the value, never the raw SCREAMING_SNAKE enum.
 * `t` comes from the rendering screen so the label follows the reader's
 * language; the bundled English is the default for call sites without one. */
export const formatMeetingPlatform = (value?: string | null, t: Translate = fallbackT): string => {
  if (!value || value === 'OTHER') return t('mweb.podDetails.online');
  return (
    LABELS[value] ??
    value
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ')
  );
};
