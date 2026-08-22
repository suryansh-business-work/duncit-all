/**
 * Communication Preferences — the part mWeb and the native app share.
 *
 * Rule 27 says the two must be identical and rule 40 says they share LOGIC,
 * never UI: the channel order, the copy and which switch is locked live here;
 * the MUI card and the Tamagui card stay in their own apps.
 *
 * Every key below is written out as a literal `t('…')` rather than built from a
 * namespace + the channel, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job.
 */

export const COMM_CHANNELS = ['EMAIL', 'WHATSAPP', 'SMS'] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];

export type CommTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/** One channel exactly as `myCommunicationPreference` returns it. */
export interface CommChannelState {
  channel: CommChannel;
  reachable: boolean;
  destination: string;
  otp_enabled: boolean;
  otp_can_disable: boolean;
}

export interface CommChannelLabels {
  name: string;
  /** What the channel's own preference screen is for. */
  hint: string;
  /** Shown instead of the switch when there is nothing to send to. */
  missing: string;
}

export interface CommPreferenceLabels {
  title: string;
  subtitle: string;
  otpLabel: string;
  otpHint: string;
  otpLocked: string;
  saved: string;
  saveFailed: string;
  loadFailed: string;
  channel: (channel: CommChannel) => CommChannelLabels;
}

export function buildCommPreferenceLabels(t: CommTranslate): CommPreferenceLabels {
  const byChannel: Record<CommChannel, CommChannelLabels> = {
    EMAIL: {
      name: t('mweb.commPreference.email'),
      hint: t('mweb.commPreference.emailHint'),
      missing: t('mweb.commPreference.emailMissing'),
    },
    WHATSAPP: {
      name: t('mweb.commPreference.whatsapp'),
      hint: t('mweb.commPreference.whatsappHint'),
      missing: t('mweb.commPreference.whatsappMissing'),
    },
    SMS: {
      name: t('mweb.commPreference.sms'),
      hint: t('mweb.commPreference.smsHint'),
      missing: t('mweb.commPreference.smsMissing'),
    },
  };
  return {
    title: t('mweb.commPreference.title'),
    subtitle: t('mweb.commPreference.subtitle'),
    otpLabel: t('mweb.commPreference.otpLabel'),
    otpHint: t('mweb.commPreference.otpHint'),
    otpLocked: t('mweb.commPreference.otpLocked'),
    saved: t('mweb.commPreference.saved'),
    saveFailed: t('mweb.commPreference.saveFailed'),
    loadFailed: t('mweb.commPreference.loadFailed'),
    channel: (channel) => byChannel[channel],
  };
}

/**
 * What one row may do, derived once so both apps agree.
 *
 * `locked` is the case worth naming: the switch is ON, cannot be turned off,
 * and the reason has to be said out loud — otherwise a disabled control reads
 * as a bug. The server decides it (`otp_can_disable`), because it is the only
 * side that can see every channel at once.
 */
export interface CommRowState {
  /** The switch is interactive. */
  canToggle: boolean;
  /** On, and the last reachable channel — say why it will not move. */
  locked: boolean;
  /** Nothing to send to, so there is no switch to offer. */
  unreachable: boolean;
}

export function commRowState(row: Readonly<CommChannelState>): CommRowState {
  if (!row.reachable) return { canToggle: false, locked: false, unreachable: true };
  const locked = row.otp_enabled && !row.otp_can_disable;
  return { canToggle: !locked, locked, unreachable: false };
}
