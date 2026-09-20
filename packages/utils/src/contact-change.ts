/**
 * Changing the email address, phone number or WhatsApp number on an account.
 *
 * mWeb and the native app render this with MUI and Tamagui respectively, but
 * the rules underneath are one set: which channels exist, what a channel is
 * called, how its current value reads, whether the person has typed enough to
 * ask for a code, and which of the two steps they are on. Rule 40 — the pair
 * shares LOGIC, never UI, and a second copy of this drifts on exactly the
 * comparison that decides whether a change is a change at all.
 *
 * Nothing here validates a shape. Each surface's dialog is a real form (rule
 * 10: React Hook Form + Zod), and the patterns it validates against live in
 * @duncit/regex, which this zero-dependency package cannot import.
 */
import {
  signupContactBlocksContinue,
  signupContactLines,
  type SignupContactCopy,
  type SignupContactLines,
  type SignupContactStatus,
} from './signup-contact';

/** The three contact details an account can change about itself. */
export const CONTACT_CHANNELS = ['EMAIL', 'PHONE', 'WHATSAPP'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** The GraphQL enum member for the two channels that are a phone number. */
export type ContactPhoneField = 'PHONE' | 'WHATSAPP';

/** Whether this channel is a number with a country code, or an address. */
export const isPhoneChannel = (channel: ContactChannel): channel is ContactPhoneField =>
  channel !== 'EMAIL';

/**
 * The feature flag that decides whether the contact number is proved by an SMS
 * code (sent through MSG91) before it is stored. Seeded OFF. It governs the
 * contact number ONLY — the WhatsApp number and the address always need a code.
 */
export const PHONE_OTP_FLAG = 'phone_otp_verification';

/**
 * Whether changing this detail still has to be proved by a one-time code.
 *
 * The address and the WhatsApp number always do: both are delivery channels
 * whose whole worth is that a message actually arrives, and a typo in either
 * goes unnoticed until something silently fails to reach anybody.
 *
 * The contact number follows `PHONE_OTP_FLAG` (`phoneOtp`). Off, it is saved
 * as typed — it is the detail people correct most often. On, it is proved by
 * an SMS code when it is added and on every change.
 *
 * Stated once here because mWeb and native both read it (rule 40): the two
 * screens must not disagree about whether a number is proved before it is
 * stored, and the server agrees from its own side — `setContactPhoneNumber`
 * refuses while the flag is on.
 */
export const contactChangeNeedsOtp = (channel: ContactChannel, phoneOtp: boolean): boolean =>
  channel !== 'PHONE' || phoneOtp;

/** Where the dialog is: typing the new value, or typing the code sent to it. */
export type ContactChangeStep = 'ENTER' | 'CODE';

/** What the account currently holds, as every surface already reads it off `me`. */
export interface ContactSnapshot {
  email?: string | null;
  phone_extension?: string | null;
  phone_number?: string | null;
  /** Set once an SMS code proved the contact number; cleared when it moves. */
  is_phone_verified?: boolean | null;
  whatsapp_extension?: string | null;
  whatsapp_number?: string | null;
  /** When a WhatsApp code proved the WhatsApp number; null once it moves. */
  whatsapp_verified_at?: string | null;
}

/** The new value being asked for. Extension is ignored for EMAIL. */
export interface ContactDraft {
  email: string;
  extension: string;
  number: string;
}

/** An empty draft, so a dialog opens the same way every time. */
export const emptyContactDraft = (extension = '+91'): ContactDraft => ({
  email: '',
  extension,
  number: '',
});

/** `+91 9876543210`, or '' when there is no number. Never a lone country code. */
export const formatPhoneLine = (
  extension?: string | null,
  number?: string | null,
): string => (number ? `${extension ?? ''} ${number}`.trim() : '');

/** What the account holds on one channel right now, '' when it holds nothing. */
export function currentContactValue(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
): string {
  if (channel === 'EMAIL') return snapshot.email ?? '';
  if (channel === 'PHONE') {
    return formatPhoneLine(snapshot.phone_extension, snapshot.phone_number);
  }
  return formatPhoneLine(snapshot.whatsapp_extension, snapshot.whatsapp_number);
}

/**
 * Whether the account holds all three contact details.
 *
 * Every one of them is required in Edit profile, so this is what keeps Save
 * shut while one is still missing. Shared rather than re-derived per surface:
 * mWeb and native must not disagree about whether a profile is complete.
 */
export const contactDetailsComplete = (snapshot: Readonly<ContactSnapshot>): boolean =>
  CONTACT_CHANNELS.every((channel) => currentContactValue(snapshot, channel) !== '');

/**
 * Whether the number on this row was proved by a one-time code — the badge.
 *
 * Only the two numbers carry one. The server stamps a number verified only
 * when a code sent to it comes back, and clears the stamp whenever the number
 * moves, so a number with no stamp was typed but never answered. A row with no
 * number has nothing to vouch for, whatever a stale stamp says.
 */
export function contactValueVerified(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
): boolean {
  if (currentContactValue(snapshot, channel) === '') return false;
  if (channel === 'PHONE') return snapshot.is_phone_verified === true;
  if (channel === 'WHATSAPP') return Boolean(snapshot.whatsapp_verified_at);
  return false;
}

/** The draft a dialog opens with: the value already on the account. */
export function contactDraftFrom(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  fallbackExtension = '+91',
): ContactDraft {
  if (channel === 'EMAIL') {
    return { email: snapshot.email ?? '', extension: fallbackExtension, number: '' };
  }
  const isPhone = channel === 'PHONE';
  const extension = isPhone ? snapshot.phone_extension : snapshot.whatsapp_extension;
  const number = isPhone ? snapshot.phone_number : snapshot.whatsapp_number;
  return { email: '', extension: extension || fallbackExtension, number: number ?? '' };
}

/** The raw value a draft would store — what the server is asked to save. */
export const contactDraftValue = (draft: Readonly<ContactDraft>, channel: ContactChannel) =>
  channel === 'EMAIL' ? draft.email.trim().toLowerCase() : draft.number.trim();

/**
 * Whether asking for a code would change anything.
 *
 * A code costs the person an SMS and a wait, so a draft that matches what the
 * account already holds is refused before one is sent rather than after. For a
 * phone the country code counts: `+1 9876543210` is a different number from
 * `+91 9876543210`, however alike the digits look.
 */
export function contactDraftIsUnchanged(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
): boolean {
  if (channel === 'EMAIL') {
    return contactDraftValue(draft, channel) === (snapshot.email ?? '').trim().toLowerCase();
  }
  const isPhone = channel === 'PHONE';
  const number = (isPhone ? snapshot.phone_number : snapshot.whatsapp_number) ?? '';
  const extension = (isPhone ? snapshot.phone_extension : snapshot.whatsapp_extension) ?? '';
  return draft.number.trim() === number.trim() && draft.extension.trim() === extension.trim();
}

/**
 * Whether the number box holds the number this channel already has.
 *
 * The box opens on the account's own number, and that number is never
 * "somebody else's" — so step one says it is the current number instead,
 * whatever the availability check answered. Only the channel's OWN value
 * counts: the WhatsApp number may be the contact number as well, or a
 * different one, and typing the contact number into the WhatsApp box is a
 * real change. An empty box is not a number at all.
 */
export const contactNumberIsCurrent = (
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
): boolean =>
  isPhoneChannel(channel) &&
  draft.number.trim() !== '' &&
  contactDraftIsUnchanged(snapshot, channel, draft);

/** The part of each dialog's state an edit to step one's box touches. */
export interface ContactEditState {
  error: string | null;
  /** The box has been changed since it opened. */
  edited: boolean;
}

/**
 * What an edit to step one's box does to the dialog's state. It drops a
 * refusal about the old value and records that the box was edited. That is
 * why a number typed back to the account's own reads "your current number",
 * while the same number the box opened on says nothing. Returns the same
 * object when nothing changes, so it can run on every keystroke without a
 * re-render.
 */
export const noteContactEdit = <S extends ContactEditState>(state: S): S =>
  state.error === null && state.edited ? state : { ...state, error: null, edited: true };

/**
 * The account's contacts with one channel's stored value folded in.
 *
 * The dialog closes onto the rows it just changed, and a row still showing the
 * old number while the refetch is in flight reads as a change that failed — so
 * both surfaces fold the value in locally as well. Which field a channel lands
 * in is stated here rather than in each of them, because a fold that put a
 * WhatsApp number in the phone row would be invisible until the refetch
 * corrected it.
 *
 * `verified` is whether a code proved the value on its way in. The contact
 * number can be stored without one, and a row that kept the old number's badge
 * beside a number nobody has answered on would claim a proof that never happened.
 */
export function applyContactDraft(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
  verified: boolean,
): ContactSnapshot {
  if (channel === 'EMAIL') {
    return { ...snapshot, email: contactDraftValue(draft, channel) };
  }
  if (channel === 'PHONE') {
    return {
      ...snapshot,
      phone_extension: draft.extension,
      phone_number: draft.number,
      is_phone_verified: verified,
    };
  }
  return {
    ...snapshot,
    whatsapp_extension: draft.extension,
    whatsapp_number: draft.number,
    whatsapp_verified_at: verified ? new Date().toISOString() : null,
  };
}

/**
 * What submitting the new value should do.
 *
 * The dialog and its native twin ask this rather than each deciding for
 * themselves, because the answer is three rules at once — is this a change at
 * all, does this channel have to be proved, and is there a second step to walk
 * to — and three rules written twice is three chances for the two screens to
 * disagree about whether a number was stored (rule 40).
 */
export type ContactSubmitAction = 'UNCHANGED' | 'SEND_CODE' | 'SAVE';

/**
 * UNCHANGED when the draft matches what the account already holds — a code
 * costs the person a wait, and a save that writes the same digits back is
 * nothing but a closed dialog that looks like it did something.
 * SEND_CODE whenever `contactChangeNeedsOtp` says so, SAVE for the contact
 * number while `phoneOtp` is off — it is then stored on this very submit.
 */
export function contactSubmitAction(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
  phoneOtp: boolean,
): ContactSubmitAction {
  if (contactDraftIsUnchanged(snapshot, channel, draft)) return 'UNCHANGED';
  return contactChangeNeedsOtp(channel, phoneOtp) ? 'SEND_CODE' : 'SAVE';
}

/** Where the number box's two fields live in step one's form (a `ContactDraft`). */
export const CONTACT_NUMBER_FIELDS = { extension: 'extension', number: 'number' } as const;

/** What step one's form knows at the moment it draws its button. */
export interface ContactValueStepInput {
  /** The send or save is in flight. */
  busy: boolean;
  /** A refusal of the typed value is showing — resending it would only repeat it. */
  blocked: boolean;
  /** The form's own validation passes. */
  isValid: boolean;
  /** The as-you-type check of the new number (IDLE on the email channel). */
  numberStatus: SignupContactStatus;
  /** `PHONE_OTP_FLAG` — whether the contact number is proved by a code. */
  phoneOtp: boolean;
  /** What the account holds now — its own number is never "taken". */
  snapshot: Readonly<ContactSnapshot>;
  /** What the box holds now. */
  draft: Readonly<ContactDraft>;
  /** The box has been changed since it opened (`noteContactEdit`). */
  edited: boolean;
}

export interface ContactValueStepView {
  /** The sentence above the box — it mentions a code only when one follows. */
  hint: string;
  buttonLabel: string;
  disabled: boolean;
  /** The helper and error lines under the number box. */
  numberLines: SignupContactLines;
}

/**
 * The lines under the number box. The account's own number is never "taken",
 * whatever the check answered for it: opened on it, the box says nothing;
 * typed back after an edit, it says this is the current number, so the shut
 * button has a reason beside it.
 */
function contactNumberLines(
  channel: ContactChannel,
  labels: Readonly<ContactChangeLabels>,
  input: Readonly<ContactValueStepInput>,
  isCurrent: boolean,
): SignupContactLines {
  if (!isCurrent) return signupContactLines(input.numberStatus, labels.numberCopy);
  const hint = labels.numberCopy.hint;
  return input.edited ? { hint, error: labels.channel(channel).currentValue } : { hint };
}

/**
 * Step one's button and the lines under its number box, decided once for the
 * dialog and its native twin (rule 40).
 *
 * While the contact number is stored straight, its button may not promise a
 * code; while it is proved by one, its hint says a code will be texted. A
 * number another account already holds — or one whose check is still in
 * flight — keeps the button shut, with the refusal written under the box. So
 * does the account's own number: there is nothing to change.
 */
export function contactValueStepView(
  channel: ContactChannel,
  labels: Readonly<ContactChangeLabels>,
  input: Readonly<ContactValueStepInput>,
): ContactValueStepView {
  const needsCode = contactChangeNeedsOtp(channel, input.phoneOtp);
  const idleLabel = needsCode ? labels.sendCode : labels.saveNumber;
  const busyLabel = needsCode ? labels.sending : labels.savingNumber;
  const provedPhone = channel === 'PHONE' && needsCode;
  const isCurrent = contactNumberIsCurrent(input.snapshot, channel, input.draft);
  return {
    hint: provedPhone ? labels.phoneCodeHint : labels.channel(channel).changeHint,
    buttonLabel: input.busy ? busyLabel : idleLabel,
    disabled:
      input.busy ||
      input.blocked ||
      !input.isValid ||
      isCurrent ||
      signupContactBlocksContinue(input.numberStatus),
    numberLines: contactNumberLines(channel, labels, input, isCurrent),
  };
}

/** The translator each surface hands in — same shape as the attendance copy. */
export type ContactTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface ContactChannelLabels {
  /** "Email", "Phone number", "WhatsApp number". */
  name: string;
  /** What the box asks for. */
  fieldLabel: string;
  /** Shown in place of the value when the account has none. */
  emptyValue: string;
  /** The dialog's title. */
  changeTitle: string;
  /** The sentence above the box, naming where the code will go. */
  changeHint: string;
  /** Under a number box typed back to the number already held. Numbers only. */
  currentValue?: string;
}

export interface ContactChangeLabels {
  channel: (channel: ContactChannel) => ContactChannelLabels;
  /** The button beside each row. */
  changeAction: string;
  addAction: string;
  /** Step one, when a code follows. */
  sendCode: string;
  sending: string;
  /** Step one, when the value is stored straight away — the contact number. */
  saveNumber: string;
  savingNumber: string;
  /** The contact number's hint while `PHONE_OTP_FLAG` is on: a code is texted. */
  phoneCodeHint: string;
  /** Step two. */
  codeLabel: string;
  codeSentTo: (destination: string) => string;
  verifyAndSave: string;
  verifying: string;
  resend: string;
  resendIn: (seconds: number) => string;
  editValue: string;
  cancel: string;
  /** Refusals raised before the server is asked. */
  unchanged: string;
  /**
   * The lines under a new number while it is checked as typed — "checking",
   * then the refusal when another account already holds it. Rendered with
   * `signupContactLines`, the same reading signup's number box uses.
   */
  numberCopy: SignupContactCopy;
  /** The code the server echoes back while no transport is wired. */
  testCode: (code: string) => string;
  /**
   * Why a code is asked for — rendered only under the channels that ask for
   * one, so the contact number's box does not explain a step it does not have.
   */
  whyOtp: string;
  /** Shown under the rows while any of the three is still missing. */
  allRequired: string;
  /** The badge beside a number a code proved (`contactValueVerified`). */
  verified: string;
  saved: (channelName: string) => string;
}

/*
  Every key below is written as a literal `t('…')`.

  `scripts/verify-translation-keys.mjs` greps source for the literal string, so
  a key assembled from a namespace plus a suffix is reported as
  shipped-but-never-rendered and fails the Shared Gates job. Same shape, and
  the same reason, as buildAttendanceLabels above it.
*/
const CHANNEL_LABELS: Record<
  ContactChannel,
  (t: ContactTranslate) => ContactChannelLabels
> = {
  EMAIL: (t) => ({
    name: t('mweb.contactChange.emailName'),
    fieldLabel: t('mweb.contactChange.emailField'),
    emptyValue: t('mweb.contactChange.emailEmpty'),
    changeTitle: t('mweb.contactChange.emailTitle'),
    changeHint: t('mweb.contactChange.emailHint'),
  }),
  PHONE: (t) => ({
    name: t('mweb.contactChange.phoneName'),
    fieldLabel: t('mweb.contactChange.phoneField'),
    emptyValue: t('mweb.contactChange.phoneEmpty'),
    changeTitle: t('mweb.contactChange.phoneTitle'),
    changeHint: t('mweb.contactChange.phoneDirectHint'),
    currentValue: t('mweb.contactChange.phoneCurrent'),
  }),
  WHATSAPP: (t) => ({
    name: t('mweb.contactChange.whatsappName'),
    fieldLabel: t('mweb.contactChange.whatsappEnterField'),
    emptyValue: t('mweb.contactChange.whatsappEmpty'),
    changeTitle: t('mweb.contactChange.whatsappTitle'),
    changeHint: t('mweb.contactChange.whatsappHint'),
    currentValue: t('mweb.contactChange.whatsappCurrent'),
  }),
};

/** Every word the two contact-change surfaces render, from one translator. */
export function buildContactChangeLabels(t: ContactTranslate): ContactChangeLabels {
  return {
    channel: (channel) => CHANNEL_LABELS[channel](t),
    changeAction: t('mweb.contactChange.change'),
    addAction: t('mweb.contactChange.add'),
    sendCode: t('mweb.contactChange.sendCode'),
    sending: t('mweb.contactChange.sending'),
    saveNumber: t('mweb.contactChange.saveNumber'),
    savingNumber: t('mweb.contactChange.savingNumber'),
    phoneCodeHint: t('mweb.contactChange.phoneCodeHint'),
    codeLabel: t('mweb.contactChange.codeLabel'),
    codeSentTo: (destination) =>
      t('mweb.contactChange.codeSentTo', { vars: { destination } }),
    verifyAndSave: t('mweb.contactChange.verifyAndSave'),
    verifying: t('mweb.contactChange.verifying'),
    resend: t('mweb.contactChange.resend'),
    resendIn: (seconds) => t('mweb.contactChange.resendIn', { vars: { seconds } }),
    editValue: t('mweb.contactChange.editValue'),
    cancel: t('mweb.contactChange.cancel'),
    unchanged: t('mweb.contactChange.unchanged'),
    numberCopy: {
      hint: '',
      checking: t('mweb.contactChange.checkingNumber'),
      taken: t('mweb.contactChange.numberTaken'),
    },
    testCode: (code) => t('mweb.contactChange.testCode', { vars: { code } }),
    whyOtp: t('mweb.contactChange.whyOtp'),
    allRequired: t('mweb.contactChange.allRequired'),
    verified: t('mweb.contactChange.verified'),
    saved: (channelName) => t('mweb.contactChange.saved', { vars: { channelName } }),
  };
}
