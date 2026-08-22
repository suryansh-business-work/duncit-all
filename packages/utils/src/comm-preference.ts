/**
 * Communication Preferences — the part mWeb and the native app share.
 *
 * Rule 27 says the two must be identical and rule 40 says they share LOGIC,
 * never UI: the channel order, the copy and what each row may do live here;
 * the MUI cards and the Tamagui cards stay in their own apps.
 *
 * The shape of the feature is one door per surface:
 *   Profile Settings -> Communication Preferences (one row)
 *     -> the hub, which lists Email / WhatsApp / SMS
 *       -> that channel's own screen, which owns EVERY switch for it,
 *          including its Authentication messages switch.
 *
 * Nothing is settable from two places. The hub only summarises, so a reader
 * never has to work out whether the switch in front of them is the same one
 * they saw a screen ago.
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
  /** What the channel's own screen is for. */
  hint: string;
  /** Shown instead of the switch when there is nothing to send to. */
  missing: string;
}

export interface CommPreferenceLabels {
  title: string;
  /** The line under the hub's heading. */
  blurb: string;
  /** The line under the single row in Profile Settings. */
  entryHint: string;
  /** The switch that used to be called "One-time codes". */
  authTitle: string;
  authBody: string;
  authLocked: string;
  authOn: string;
  authOff: string;
  /** "Sent to ravi@duncit.com." */
  authSentTo: (destination: string) => string;
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
    blurb: t('mweb.commPreference.blurb'),
    entryHint: t('mweb.commPreference.entryHint'),
    authTitle: t('mweb.commPreference.authTitle'),
    authBody: t('mweb.commPreference.authBody'),
    authLocked: t('mweb.commPreference.authLocked'),
    authOn: t('mweb.commPreference.authOn'),
    authOff: t('mweb.commPreference.authOff'),
    authSentTo: (destination) =>
      t('mweb.commPreference.authSentTo', { vars: { destination } }),
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

/**
 * The one line under a channel's name on the hub.
 *
 * It answers the two questions somebody opens the hub with — where does this
 * go, and are my sign-in codes coming here — without making them open the
 * channel to find out. An unreachable channel says what to do instead, because
 * "off" and "there is no number" are not the same answer.
 */
export function commChannelSummary(
  row: Readonly<CommChannelState>,
  labels: Readonly<CommPreferenceLabels>,
): string {
  if (!row.reachable) return labels.channel(row.channel).missing;
  const auth = row.otp_enabled ? labels.authOn : labels.authOff;
  return `${row.destination} · ${auth}`;
}

/** Everything the Authentication messages card renders, decided once. */
export interface AuthMessageCardState {
  title: string;
  body: string;
  /** The status line under the body — never empty. */
  note: string;
  /** False when there is nothing to send to, so no switch is offered. */
  showSwitch: boolean;
  canToggle: boolean;
  checked: boolean;
}

/**
 * The Authentication messages card, for one channel.
 *
 * Three states, and each one has to say something different: a normal channel
 * names where the codes land, the LAST reachable channel explains why its
 * switch will not move, and a channel with no address explains what is
 * missing. A card that rendered the same sentence for all three would make the
 * disabled switch read as a bug.
 */
export function authMessageCardState(
  row: Readonly<CommChannelState>,
  labels: Readonly<CommPreferenceLabels>,
): AuthMessageCardState {
  const state = commRowState(row);
  const base = { title: labels.authTitle, body: labels.authBody };
  if (state.unreachable) {
    return {
      ...base,
      note: labels.channel(row.channel).missing,
      showSwitch: false,
      canToggle: false,
      checked: false,
    };
  }
  const note = state.locked ? labels.authLocked : labels.authSentTo(row.destination);
  return {
    ...base,
    note,
    showSwitch: true,
    canToggle: state.canToggle,
    checked: row.otp_enabled,
  };
}

/** The channel in a loaded sheet, or null while there is not one. */
export function findCommChannel(
  channels: readonly CommChannelState[] | null | undefined,
  channel: CommChannel,
): CommChannelState | null {
  return channels?.find((row) => row.channel === channel) ?? null;
}
