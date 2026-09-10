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

/**
 * Whether changing this detail still has to be proved by a one-time code.
 *
 * The contact number is saved as typed — it is the detail people correct most
 * often, and a code on every correction turned a one-line fix into a wait. The
 * address and the WhatsApp number keep theirs: both are delivery channels whose
 * whole worth is that a message actually arrives, and a typo in either goes
 * unnoticed until something silently fails to reach anybody.
 *
 * Stated once here because mWeb and native both read it (rule 40): the two
 * screens must not disagree about whether a number is proved before it is
 * stored, and the server agrees from its own side —
 * `setContactPhoneNumber` takes no code, the other two refuse without one.
 */
export const contactChangeNeedsOtp = (channel: ContactChannel): boolean =>
  channel !== 'PHONE';

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

/**
 * The account's contacts with one channel's stored value folded in.
 *
 * The dialog closes onto the rows it just changed, and a row still showing the
 * old number while the refetch is in flight reads as a change that failed — so
 * both surfaces fold the value in locally as well. Which field a channel lands
 * in is stated here rather than in each of them, because a fold that put a
 * WhatsApp number in the phone row would be invisible until the refetch
 * corrected it.
 */
export function applyContactDraft(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
): ContactSnapshot {
  if (channel === 'EMAIL') {
    return { ...snapshot, email: contactDraftValue(draft, channel) };
  }
  if (channel === 'PHONE') {
    return { ...snapshot, phone_extension: draft.extension, phone_number: draft.number };
  }
  return { ...snapshot, whatsapp_extension: draft.extension, whatsapp_number: draft.number };
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
 * SEND_CODE for the address and the WhatsApp number, SAVE for the contact
 * number, which is stored on this very submit.
 */
export function contactSubmitAction(
  snapshot: Readonly<ContactSnapshot>,
  channel: ContactChannel,
  draft: Readonly<ContactDraft>,
): ContactSubmitAction {
  if (contactDraftIsUnchanged(snapshot, channel, draft)) return 'UNCHANGED';
  return contactChangeNeedsOtp(channel) ? 'SEND_CODE' : 'SAVE';
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
  /** Step one, when a code follows. */
  sendCode: string;
  sending: string;
  /** Step one, when the value is stored straight away — the contact number. */
  saveNumber: string;
  savingNumber: string;
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
  /**
   * Why a code is asked for — rendered only under the channels that ask for
   * one, so the contact number's box does not explain a step it does not have.
   */
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
    changeHint: t('mweb.contactChange.phoneDirectHint'),
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
    saveNumber: t('mweb.contactChange.saveNumber'),
    savingNumber: t('mweb.contactChange.savingNumber'),
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
