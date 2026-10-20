/**
 * Continue with Truecaller — the half mWeb and the native app share.
 *
 * Truecaller proves which number somebody is holding. The server turns that
 * into either a session (the number has an account) or a signup proof: the
 * same one-shot token a WhatsApp code earns, so signup can skip the code step
 * for THAT number. Everything here is about carrying that proof correctly —
 * which number it covers, what it may prefill, and how to read it back off a
 * navigation — and nothing about how either app draws a button (rule 40).
 */
import type { SignupNumberFields } from './signup-flow';

/** Which Truecaller door a verification came through. */
export type TruecallerPlatform = 'ANDROID' | 'IOS' | 'WEB';

/** Which screen asked — only the wording of Truecaller's sheet differs. */
export type TruecallerIntent = 'LOGIN' | 'SIGNUP';

/** The server's `TruecallerSignupProof`: a proven number, unspent. */
export interface TruecallerSignupProof {
  whatsapp_token: string;
  phone_extension: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  /** Blank when Truecaller had none; a suggestion, never verified. */
  email: string;
}

/** The navigation-state key a proof travels under, login → signup. */
export const TRUECALLER_SIGNUP_STATE_KEY = 'truecallerSignup';

/** How often the mobile-web page asks whether Truecaller has answered. */
export const TRUECALLER_WEB_POLL_MS = 2000;
/** How long it keeps asking — Truecaller's sheet expires well before this. */
export const TRUECALLER_WEB_TIMEOUT_MS = 2 * 60 * 1000;

/** Literal keys so the localization gate can find them. */
export const TRUECALLER_COPY = {
  short: 'mweb.auth.truecallerShort',
  signIn: 'mweb.auth.truecallerSignIn',
  signUp: 'mweb.auth.truecallerSignUp',
  failed: 'mweb.auth.truecallerFailed',
  notInstalled: 'mweb.auth.truecallerNotInstalled',
  declined: 'mweb.auth.truecallerDeclined',
  verified: 'mweb.signupSteps.truecallerVerified',
} as const;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * A proof read back off router state or a navigation param — anything that
 * is not one, whole, reads as none. State is replayed by reloads and arrives
 * from wherever navigated here, so it is never trusted to be well-formed.
 */
export function readTruecallerSignupProof(value: unknown): TruecallerSignupProof | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const proof: TruecallerSignupProof = {
    whatsapp_token: text(raw.whatsapp_token),
    phone_extension: text(raw.phone_extension),
    phone_number: text(raw.phone_number),
    first_name: text(raw.first_name),
    last_name: text(raw.last_name),
    email: text(raw.email),
  };
  if (!proof.whatsapp_token || !proof.phone_extension || !proof.phone_number) return null;
  return proof;
}

/** What the signup form may start from: the name, the number, the address. */
export function truecallerSignupPrefill(proof: Readonly<TruecallerSignupProof>) {
  return {
    name: [proof.first_name, proof.last_name].filter(Boolean).join(' ').trim(),
    email: proof.email,
    phoneExtension: proof.phone_extension,
    phoneNumber: proof.phone_number,
    // Truecaller proved the SIM the person is holding — their mobile.
    whatsappIsMobile: true,
  };
}

const digits = (value: string) => value.replace(/\D/g, '');

/**
 * The proof's token, when the number the form is about to sign up with IS the
 * number Truecaller proved — and null otherwise, so a number changed after the
 * prefill goes through the WhatsApp code like any other. The server checks
 * the same thing again; this only decides whether to ask for a code.
 */
export function truecallerTokenFor(
  proof: Readonly<TruecallerSignupProof> | null,
  fields: Readonly<SignupNumberFields>,
): string | null {
  if (!proof) return null;
  const sameNumber =
    digits(proof.phone_extension) === digits(fields.phoneExtension) &&
    digits(proof.phone_number) === digits(fields.phoneNumber);
  return sameNumber ? proof.whatsapp_token : null;
}
