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

/** The three contact details an account can change about itself. */
export const CONTACT_CHANNELS = ['EMAIL', 'PHONE', 'WHATSAPP'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** The GraphQL enum member for the two channels that are a phone number. */
export type ContactPhoneField = 'PHONE' | 'WHATSAPP';

/** Whether this channel is a number with a country code, or an address. */
export const isPhoneChannel = (channel: ContactChannel): channel is ContactPhoneField =>
  channel !== 'EMAIL';

/** Where the dialog is: typing the new value, or typing the code sent to it. */
export type ContactChangeStep = 'ENTER' | 'CODE';

/** What the account currently holds, as every surface already reads it off `me`. */
export interface ContactSnapshot {
  email?: string | null;
  phone_extension?: string | null;
  phone_number?: string | null;
  whatsapp_extension?: string | null;
  whatsapp_number?: string | null;
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
}

export interface ContactChangeLabels {
  channel: (channel: ContactChannel) => ContactChannelLabels;
  /** The button beside each row. */
  changeAction: string;
  addAction: string;
  /** Step one. */
  sendCode: string;
  sending: string;
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
  /** The code the server echoes back while no transport is wired. */
  testCode: (code: string) => string;
  /** The line explaining why any of this asks for a code at all. */
  whyOtp: string;
  /** Shown under the rows while any of the three is still missing. */
  allRequired: string;
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
    changeHint: t('mweb.contactChange.phoneHint'),
  }),
  WHATSAPP: (t) => ({
    name: t('mweb.contactChange.whatsappName'),
    fieldLabel: t('mweb.contactChange.whatsappField'),
    emptyValue: t('mweb.contactChange.whatsappEmpty'),
    changeTitle: t('mweb.contactChange.whatsappTitle'),
    changeHint: t('mweb.contactChange.whatsappHint'),
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
    testCode: (code) => t('mweb.contactChange.testCode', { vars: { code } }),
    whyOtp: t('mweb.contactChange.whyOtp'),
    allRequired: t('mweb.contactChange.allRequired'),
    saved: (channelName) => t('mweb.contactChange.saved', { vars: { channelName } }),
  };
}
