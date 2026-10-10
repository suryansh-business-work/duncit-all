/**
 * The translation keys for a pod challenge's statuses, host actions and
 * switches — written out as literals once, here, for mWeb and the native app
 * alike. A key composed at the call site (`status.${s}`) renders fine but is
 * invisible to the translation gate, so every surface reads these maps instead.
 */

export const CHALLENGE_STATUS_KEYS: Readonly<Record<string, string>> = {
  DRAFT: 'mweb.challenge.status.DRAFT',
  SCHEDULED: 'mweb.challenge.status.SCHEDULED',
  LIVE: 'mweb.challenge.status.LIVE',
  PAUSED: 'mweb.challenge.status.PAUSED',
  COMPLETED: 'mweb.challenge.status.COMPLETED',
  CANCELLED: 'mweb.challenge.status.CANCELLED',
  ARCHIVED: 'mweb.challenge.status.ARCHIVED',
};

export const CHALLENGE_ACTION_KEYS: Readonly<Record<string, string>> = {
  SCHEDULE: 'mweb.challenge.actions.SCHEDULE',
  UNSCHEDULE: 'mweb.challenge.actions.UNSCHEDULE',
  START: 'mweb.challenge.actions.START',
  PAUSE: 'mweb.challenge.actions.PAUSE',
  RESUME: 'mweb.challenge.actions.RESUME',
  COMPLETE: 'mweb.challenge.actions.COMPLETE',
  CANCEL: 'mweb.challenge.actions.CANCEL',
  ARCHIVE: 'mweb.challenge.actions.ARCHIVE',
};

/** Actions that end or freeze play, and so ask before they run. */
export const CHALLENGE_CONFIRM_KEYS: Readonly<Record<string, { title: string; body: string }>> = {
  COMPLETE: { title: 'mweb.challenge.confirm.COMPLETE.title', body: 'mweb.challenge.confirm.COMPLETE.body' },
  CANCEL: { title: 'mweb.challenge.confirm.CANCEL.title', body: 'mweb.challenge.confirm.CANCEL.body' },
  ARCHIVE: { title: 'mweb.challenge.confirm.ARCHIVE.title', body: 'mweb.challenge.confirm.ARCHIVE.body' },
};

export type ChallengeToggle = 'enabled' | 'show_on_pod_details' | 'audience_interaction_enabled' | 'auto_whatsapp' | 'auto_email';

/** The host's switches, in the order they are shown. */
export const CHALLENGE_TOGGLES: ReadonlyArray<{ key: ChallengeToggle; label: string }> = [
  { key: 'enabled', label: 'mweb.challenge.toggles.enabled' },
  { key: 'show_on_pod_details', label: 'mweb.challenge.toggles.show_on_pod_details' },
  { key: 'audience_interaction_enabled', label: 'mweb.challenge.toggles.audience_interaction_enabled' },
  { key: 'auto_whatsapp', label: 'mweb.challenge.toggles.auto_whatsapp' },
  { key: 'auto_email', label: 'mweb.challenge.toggles.auto_email' },
];
