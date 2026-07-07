/**
 * Deterministic, key-independent content checks for host-authored pod text.
 * Catches the hard community-guideline rules — no phone numbers, emails,
 * external/payment links, payment handles, off-platform contact solicitation,
 * or abusive/adult wording — WITHOUT needing an LLM, so moderation still works
 * (and blocks the obvious violations) when OpenAI is not configured.
 */

export type ModerationStep = 'REGEX' | 'AI';

export interface ModerationViolation {
  field: string;
  step: ModerationStep;
  type: string;
  message: string;
  evidence?: string | null;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const EMAIL_GLOBAL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// A scheme/www link is always a link; a bare `word.tld` only counts for TLDs
// that are not common English words (dropping in/co/me/app/club avoids blocking
// "fill.in", "join.me", "notes.app", "photography.club"; adding ai/tech/live
// covers the modern off-platform vectors).
const URL_RE =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]+\.(?:com|net|org|io|xyz|gg|ly|shop|store|info|biz|online|site|dev|ai|tech|live)\b/i;
// Digit runs (optionally with +, spaces, dashes, dots, brackets) that resolve
// to a 10–15 digit phone number.
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{7,}\d/g;

const escapeRe = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordListRe = (words: string[]) => new RegExp(`\\b(?:${words.map(escapeRe).join('|')})\\b`, 'i');

// Collecting payments outside the platform.
const PAYMENT_RE = wordListRe([
  'upi', 'gpay', 'g-pay', 'googlepay', 'phonepe', 'paytm', 'razorpay', 'bhim',
  'paypal', 'venmo', 'payment link', 'pay now', 'pay here', 'send money',
  'account number', 'ifsc', 'qr code', 'scan to pay', 'net banking',
]);
// Pushing users to contact the host off-platform.
const CONTACT_RE = wordListRe([
  'whatsapp me', 'dm me', 'call me', 'text me', 'contact me on', 'ping me on', 'reach me at',
]);
// A compact deterministic net for the most common abuse; GPT-4o covers the rest.
const ABUSE_RE = wordListRe([
  'fuck', 'fucking', 'motherfucker', 'bitch', 'bastard', 'asshole', 'slut',
  'retard', 'chutiya', 'chutiye', 'madarchod', 'behenchod', 'bhosdike', 'gaand', 'randi',
]);
// Adult / explicit wording (text only; images are screened by the AI layer).
const NUDE_RE = wordListRe([
  'nude', 'nudes', 'naked', 'porn', 'porno', 'xxx', 'sex', 'sexual', 'nsfw', 'escort', 'hookup', 'onlyfans',
]);

const violation = (
  field: string,
  type: string,
  message: string,
  evidence: string | null
): ModerationViolation => ({ field, step: 'REGEX', type, message, evidence });

/**
 * The first phone-like sequence in the text, or null. After stripping a leading
 * Indian trunk/country prefix (0 / 91 / 091 / 0091), the number must be a 10-digit
 * mobile (starts 6–9). This catches `9876543210`, `09876543210`, `+91 98765 43210`
 * while rejecting timestamps/IDs (e.g. a 13-digit ms value) and stray number
 * lists / price schedules that merely add up to 10+ digits.
 */
function detectPhone(text: string): string | null {
  const candidates = text.match(PHONE_CANDIDATE_RE) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    const national = digits.replace(/^(?:0091|091|91|0)/, '');
    if (national.length === 10 && /^[6-9]/.test(national)) return candidate.trim();
  }
  return null;
}

/** All deterministic violations for one text field (title/description/info/hashtag). */
export function moderateText(field: string, raw: string): ModerationViolation[] {
  const text = (raw ?? '').trim();
  if (!text) return [];
  const out: ModerationViolation[] = [];

  const email = EMAIL_RE.exec(text);
  if (email) {
    out.push(violation(field, 'EMAIL', 'Remove the email address — sharing contact emails is not allowed.', email[0]));
  }
  const phone = detectPhone(text);
  if (phone) {
    out.push(violation(field, 'PHONE', 'Remove the phone number — sharing phone numbers is not allowed.', phone));
  }
  // Strip emails first so an email domain is not double-flagged as a link.
  const withoutEmail = text.replace(EMAIL_GLOBAL_RE, ' ');
  const url = URL_RE.exec(withoutEmail);
  if (url) {
    out.push(violation(field, 'LINK', 'Remove the link — external or payment links are not allowed.', url[0]));
  }
  const payment = PAYMENT_RE.exec(text);
  if (payment) {
    out.push(violation(field, 'PAYMENT', 'Remove payment details — collecting payments outside Duncit is not allowed.', payment[0]));
  }
  const contact = CONTACT_RE.exec(text);
  if (contact) {
    out.push(violation(field, 'CONTACT', 'Do not ask people to contact you off-platform.', contact[0]));
  }
  const abuse = ABUSE_RE.exec(text);
  if (abuse) {
    out.push(violation(field, 'ABUSE', 'Remove offensive or abusive language.', abuse[0]));
  }
  const nude = NUDE_RE.exec(text);
  if (nude) {
    out.push(violation(field, 'NUDITY', 'Remove explicit or adult content.', nude[0]));
  }
  return out;
}
