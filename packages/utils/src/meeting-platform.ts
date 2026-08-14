/**
 * The one list of meeting platforms, and the one way to name them.
 *
 * There were three copies before this: the admin console's option list, and a
 * label map each in mWeb and the native app. Adding a host-side dropdown would
 * have made five — and the drift had already started, because the write side
 * accepted free text while both read sides only decoded SCREAMING_SNAKE codes.
 * A host who typed "Google Meet" got "Google meet" back on the pod page.
 *
 * Framework-free on purpose: the native app resolves `@duncit/utils` through an
 * npm file: link, so anything reachable from here must import no react, no
 * tamagui and no sibling `@duncit/*` package or Metro fails the mobile build —
 * and only in CI, never locally.
 */

/** The codes stored in `Pod.meeting_platform`. `OTHER` means "link pasted by hand". */
export const MEETING_PLATFORM_VALUES = ['GOOGLE_MEET', 'ZOOM', 'TEAMS', 'OTHER'] as const;

export type MeetingPlatformValue = (typeof MEETING_PLATFORM_VALUES)[number];

/**
 * Product names, identical in every language, so they are NOT localization
 * keys. Only "Other" and the no-platform stand-in are copy, and those are
 * passed in by the caller.
 *
 * `MICROSOFT_TEAMS`, `SKYPE` and `WEBEX` are read-only legacy: rows written
 * before this list existed still hold them, and dropping them would render a
 * live pod's platform as title-cased sludge.
 */
const PRODUCT_NAMES: Readonly<Record<string, string>> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  TEAMS: 'Microsoft Teams',
  MICROSOFT_TEAMS: 'Microsoft Teams',
  SKYPE: 'Skype',
  WEBEX: 'Webex',
};

/** `GOOGLE_MEET` → `Google Meet`; anything unknown title-cased, never raw. */
export function meetingPlatformName(value: string): string {
  return (
    PRODUCT_NAMES[value] ??
    value
      .toLowerCase()
      .split('_')
      // `word[0]` is index access: the native app compiles with
      // noUncheckedIndexedAccess, so it is string | undefined there.
      .map((word) => (word ? `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}` : ''))
      .join(' ')
  );
}

/**
 * The dropdown, in the order a host scans it.
 *
 * `otherLabel` is the caller's localized "Other (paste link manually)" — the
 * only entry that is copy rather than a product name.
 */
export function meetingPlatformOptions(
  otherLabel: string,
): ReadonlyArray<{ value: MeetingPlatformValue; label: string }> {
  return MEETING_PLATFORM_VALUES.map((value) => ({
    value,
    label: value === 'OTHER' ? otherLabel : meetingPlatformName(value),
  }));
}

/** Whether a stored value is one this build offers in the picker. */
export function isMeetingPlatform(value: unknown): value is MeetingPlatformValue {
  return (
    typeof value === 'string' && (MEETING_PLATFORM_VALUES as readonly string[]).includes(value)
  );
}
