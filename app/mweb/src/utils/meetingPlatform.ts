const LABELS: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MICROSOFT_TEAMS: 'Microsoft Teams',
  TEAMS: 'Microsoft Teams',
  SKYPE: 'Skype',
  WEBEX: 'Webex',
  OTHER: 'Online',
};

/** Maps a meeting-platform enum (e.g. GOOGLE_MEET) to a human label. Falls back
 * to a title-cased version of the value, never the raw SCREAMING_SNAKE enum. */
export const formatMeetingPlatform = (value?: string | null): string => {
  if (!value) return 'Online';
  return (
    LABELS[value] ??
    value
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ')
  );
};
