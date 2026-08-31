/**
 * Recovering a forgotten password — the rules mWeb and the native app share.
 *
 * The two render this with MUI and Tamagui respectively, but the decisions
 * underneath are one set: which channels a code can be sent on, which of the
 * four steps the screen is on, how long is left on the resend cooldown, and
 * every word either surface prints. Rule 40 — the pair shares LOGIC, never UI,
 * and a second copy of this drifts on exactly the step machine that decides
 * whether somebody can go back a step at all.
 *
 * Nothing here validates a shape. Each surface's steps are real forms (rule 10:
 * React Hook Form + Zod) and the patterns they validate against live in
 * `@duncit/forms/schemas`, which this zero-dependency package cannot import.
 *
 * The draft shape is deliberately `ContactDraft` from the file next door: the
 * question "an email address, or a country code and a number" is the same one,
 * and answering it twice is how the two screens end up disagreeing about what
 * counts as a phone number.
 */

import type { ContactChannel, ContactDraft } from './contact-change';

/** Where a reset code can be sent. The server's `PasswordResetChannel`. */
export const PASSWORD_RECOVERY_CHANNELS = ['EMAIL', 'PHONE'] as const;

/**
 * Typed off `ContactChannel` rather than the array, so the two files cannot
 * drift into two spellings of the same channel.
 */
export type PasswordRecoveryChannel = Extract<ContactChannel, 'EMAIL' | 'PHONE'>;

/**
 * Which step the screen is on.
 *
 * CHANNEL: pick email or phone and type it.
 * CODE:    type the six digits that were sent.
 * PASSWORD: choose the new one, twice.
 * DONE:    it worked — the only step with no way back.
 */
export const PASSWORD_RECOVERY_STEPS = ['CHANNEL', 'CODE', 'PASSWORD', 'DONE'] as const;
export type PasswordRecoveryStep = (typeof PASSWORD_RECOVERY_STEPS)[number];

/** The 1-based position of a step, for a stepper's "Step 2 of 3". */
export const passwordRecoveryStepIndex = (step: PasswordRecoveryStep): number =>
  PASSWORD_RECOVERY_STEPS.indexOf(step) + 1;

/** How many steps a person actually fills in. DONE is an outcome, not a step. */
export const PASSWORD_RECOVERY_STEP_COUNT = PASSWORD_RECOVERY_STEPS.length - 1;

/**
 * The step Back goes to, or null when there is nowhere to go.
 *
 * DONE returns null on purpose: the password has already changed, and a Back
 * button there would offer to change it again with a code that has been spent.
 */
export function previousRecoveryStep(step: PasswordRecoveryStep): PasswordRecoveryStep | null {
  if (step === 'CODE') return 'CHANNEL';
  if (step === 'PASSWORD') return 'CODE';
  return null;
}

/** The state one recovery attempt carries between its steps. */
export interface PasswordRecoveryState {
  step: PasswordRecoveryStep;
  channel: PasswordRecoveryChannel;
  /** What was typed on step one — kept so a resend needs no re-entry. */
  draft: ContactDraft;
  /** The one-shot grant step two earned, '' until it has. */
  resetToken: string;
  /** When the last code went out, so the cooldown can be counted down. */
  lastSentAt: number | null;
  /** Seconds the server said to wait between codes. */
  resendAfterSeconds: number;
}

/** A fresh attempt. Email first: it is the channel every account has. */
export const initialRecoveryState = (
  draft: ContactDraft,
  resendAfterSeconds = 30,
): PasswordRecoveryState => ({
  step: 'CHANNEL',
  channel: 'EMAIL',
  draft,
  resetToken: '',
  lastSentAt: null,
  resendAfterSeconds,
});

/**
 * Seconds left before another code may be asked for, never below zero.
 *
 * Counted from when the last one was SENT rather than from a server timestamp,
 * because the button being counted down is on the screen that sent it — and a
 * clock that disagrees with the server by a few seconds must not leave a person
 * pressing a button that answers "wait 1s" forever.
 */
export function recoveryResendSeconds(
  state: Readonly<Pick<PasswordRecoveryState, 'lastSentAt' | 'resendAfterSeconds'>>,
  now: number = Date.now(),
): number {
  if (state.lastSentAt === null) return 0;
  const elapsed = Math.floor((now - state.lastSentAt) / 1000);
  return Math.max(state.resendAfterSeconds - elapsed, 0);
}

/** What the code was sent to, as the screen says it back. */
export function recoveryDestination(
  channel: PasswordRecoveryChannel,
  draft: Readonly<ContactDraft>,
): string {
  if (channel === 'EMAIL') return draft.email.trim().toLowerCase();
  return `${draft.extension} ${draft.number}`.trim();
}

/** The translator each surface hands in — the same shape as the copy next door. */
export type PasswordRecoveryTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface PasswordRecoveryChannelLabels {
  /** The tab or toggle. */
  name: string;
  /** What the box asks for. */
  fieldLabel: string;
  placeholder: string;
  /** The sentence above the box, saying where the code will go. */
  hint: string;
}

export interface PasswordRecoveryLabels {
  channel: (channel: PasswordRecoveryChannel) => PasswordRecoveryChannelLabels;
  /** Step one. */
  chooseTitle: string;
  chooseTitleAccent: string;
  chooseSubtitle: string;
  sendCode: string;
  sending: string;
  /** The refusal a destination with no account behind it gets. */
  notFound: string;
  newToDuncit: string;
  createAccount: string;
  /** Step two. */
  codeTitle: string;
  codeTitleAccent: string;
  codeSubtitle: (destination: string) => string;
  codeLabel: string;
  codeExpiry: (minutes: number) => string;
  verify: string;
  verifying: string;
  didntGetIt: string;
  resend: string;
  resending: string;
  resendIn: (seconds: number) => string;
  /** The code the server echoes back while a medium cannot really carry it. */
  testCode: (code: string) => string;
  /** Step three. */
  passwordTitle: string;
  passwordTitleAccent: string;
  passwordSubtitle: string;
  savePassword: string;
  saving: string;
  /** Step four. */
  doneTitle: string;
  doneTitleAccent: string;
  doneSubtitle: string;
  continueToLogin: string;
  /** Shared chrome. */
  back: string;
  stepOf: (current: number, total: number) => string;
  rememberedIt: string;
  backToLogin: string;
}

/*
  Every key below is written as a literal `t('…')`.

  `scripts/verify-translation-keys.mjs` greps source for the literal string, so
  a key assembled from a namespace plus a suffix is reported as
  shipped-but-never-rendered and fails the Shared Gates job. Same shape, and the
  same reason, as buildContactChangeLabels beside it.
*/
const CHANNEL_LABELS: Record<
  PasswordRecoveryChannel,
  (t: PasswordRecoveryTranslate) => PasswordRecoveryChannelLabels
> = {
  EMAIL: (t) => ({
    name: t('mweb.passwordRecovery.emailName'),
    fieldLabel: t('mweb.passwordRecovery.emailField'),
    placeholder: t('mweb.passwordRecovery.emailPlaceholder'),
    hint: t('mweb.passwordRecovery.emailHint'),
  }),
  PHONE: (t) => ({
    name: t('mweb.passwordRecovery.phoneName'),
    fieldLabel: t('mweb.passwordRecovery.phoneField'),
    placeholder: t('mweb.passwordRecovery.phonePlaceholder'),
    hint: t('mweb.passwordRecovery.phoneHint'),
  }),
};

/** Every word both recovery surfaces render, from one translator. */
export function buildPasswordRecoveryLabels(
  t: PasswordRecoveryTranslate,
): PasswordRecoveryLabels {
  return {
    channel: (channel) => CHANNEL_LABELS[channel](t),
    chooseTitle: t('mweb.passwordRecovery.chooseTitle'),
    chooseTitleAccent: t('mweb.passwordRecovery.chooseTitleAccent'),
    chooseSubtitle: t('mweb.passwordRecovery.chooseSubtitle'),
    sendCode: t('mweb.passwordRecovery.sendCode'),
    sending: t('mweb.passwordRecovery.sending'),
    notFound: t('mweb.passwordRecovery.notFound'),
    newToDuncit: t('mweb.passwordRecovery.newToDuncit'),
    createAccount: t('mweb.passwordRecovery.createAccount'),
    codeTitle: t('mweb.passwordRecovery.codeTitle'),
    codeTitleAccent: t('mweb.passwordRecovery.codeTitleAccent'),
    codeSubtitle: (destination) =>
      t('mweb.passwordRecovery.codeSubtitle', { vars: { destination } }),
    codeLabel: t('mweb.passwordRecovery.codeLabel'),
    codeExpiry: (minutes) => t('mweb.passwordRecovery.codeExpiry', { vars: { minutes } }),
    verify: t('mweb.passwordRecovery.verify'),
    verifying: t('mweb.passwordRecovery.verifying'),
    didntGetIt: t('mweb.passwordRecovery.didntGetIt'),
    resend: t('mweb.passwordRecovery.resend'),
    resending: t('mweb.passwordRecovery.resending'),
    resendIn: (seconds) => t('mweb.passwordRecovery.resendIn', { vars: { seconds } }),
    testCode: (code) => t('mweb.passwordRecovery.testCode', { vars: { code } }),
    passwordTitle: t('mweb.passwordRecovery.passwordTitle'),
    passwordTitleAccent: t('mweb.passwordRecovery.passwordTitleAccent'),
    passwordSubtitle: t('mweb.passwordRecovery.passwordSubtitle'),
    savePassword: t('mweb.passwordRecovery.savePassword'),
    saving: t('mweb.passwordRecovery.saving'),
    doneTitle: t('mweb.passwordRecovery.doneTitle'),
    doneTitleAccent: t('mweb.passwordRecovery.doneTitleAccent'),
    doneSubtitle: t('mweb.passwordRecovery.doneSubtitle'),
    continueToLogin: t('mweb.passwordRecovery.continueToLogin'),
    back: t('mweb.passwordRecovery.back'),
    stepOf: (current, total) =>
      t('mweb.passwordRecovery.stepOf', { vars: { current, total } }),
    rememberedIt: t('mweb.passwordRecovery.rememberedIt'),
    backToLogin: t('mweb.auth.backToLogin'),
  };
}
