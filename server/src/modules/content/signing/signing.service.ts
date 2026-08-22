import { GraphQLError } from 'graphql';
import { Types, type Document } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { SIGNATURE_METHODS, type ISignatory, type SignatureMethod } from './signing.model';

/**
 * The rules a signature has to satisfy, wherever it is given.
 *
 * Documents and contracts both sign through this file. That is the whole point:
 * "every field is required", "the date comes from the server", "the record
 * locks when nobody is left" and "only the methods this platform allows" are
 * the rules that make a signature evidence, and a second copy of them would
 * drift on the half nobody looked at (rule 34).
 */

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** The upload ceiling from the brief, enforced server-side as well as in the form. */
const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

/**
 * The feature flag that switches each signing method on or off.
 *
 * Named rather than derived so the keys are greppable from the Admin screen
 * that toggles them.
 */
const SIGNATURE_METHOD_FLAG: Record<SignatureMethod, string> = {
  DRAW: 'legal_sign_draw',
  TYPE: 'legal_sign_type',
  UPLOAD: 'legal_sign_upload',
};

/**
 * Which ways of signing this deployment allows.
 *
 * Read from the feature flags an admin already manages, so "respect system
 * configuration" is a switch somebody can throw rather than a redeploy. All
 * three are offered when nothing has been configured — a flag nobody has
 * created must not silently leave the portal with no way to sign at all.
 */
export async function allowedSignatureMethods(): Promise<SignatureMethod[]> {
  const { settingsService } = await import('@modules/platform/settings/settings.service');
  const flags = await settingsService.listPublicFlags();
  const byKey = new Map(flags.map((f: any) => [f.key, !!f.enabled]));
  return SIGNATURE_METHODS.filter((method) => {
    const flag = SIGNATURE_METHOD_FLAG[method];
    return byKey.has(flag) ? byKey.get(flag) : true;
  });
}

/** Roughly how many bytes a base64 payload decodes to, without decoding it. */
export function assertSignatureSize(image: string): void {
  const base64 = image.startsWith('data:') ? (image.split(',')[1] ?? '') : '';
  if (!base64) return; // A hosted URL carries no bytes here.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_SIGNATURE_BYTES) {
    fail('BAD_USER_INPUT', 'Signature image must be smaller than 5 MB');
  }
}

export interface SignatureInput {
  full_name?: string;
  designation?: string;
  initials?: string;
  signature_image?: string;
  signature_method?: string;
}

interface CleanSignature {
  full_name: string;
  designation: string;
  initials: string;
  signature_image: string;
  signature_method: SignatureMethod;
}

/**
 * Check and normalise what the form sent.
 *
 * Every field is required because a signature without a name, a role and a date
 * is not evidence of anything. The signing date is NOT among them: it is taken
 * from the server when the row is written, because a date the signer can type
 * is a date the signer can choose.
 */
export async function validateSignature(input: SignatureInput): Promise<CleanSignature> {
  const full_name = String(input.full_name ?? '').trim();
  const designation = String(input.designation ?? '').trim();
  const initials = String(input.initials ?? '').trim();
  const signature_image = String(input.signature_image ?? '').trim();
  const signature_method = String(input.signature_method ?? '').toUpperCase() as SignatureMethod;

  if (!full_name) fail('BAD_USER_INPUT', 'Full name is required');
  if (!designation) fail('BAD_USER_INPUT', 'Designation is required');
  if (!initials) fail('BAD_USER_INPUT', 'Initials are required');
  if (!signature_image) fail('BAD_USER_INPUT', 'A signature is required');
  if (!SIGNATURE_METHODS.includes(signature_method)) {
    fail('BAD_USER_INPUT', 'Unknown signature method');
  }

  const allowed = await allowedSignatureMethods();
  if (!allowed.includes(signature_method)) {
    fail(
      'FORBIDDEN',
      `Signing by ${signature_method.toLowerCase()} is switched off for this platform.`
    );
  }
  assertSignatureSize(signature_image);
  return { full_name, designation, initials, signature_image, signature_method };
}

/** A record that carries a signatory list and locks when it is complete. */
export interface Signable extends Document {
  signatories: Types.DocumentArray<ISignatory>;
  signed_at: Date | null;
}

/**
 * Record one person's signature, and lock the record if that was the last one.
 *
 * Fills THIS person's row — creating one if they were not on the list — and
 * finalises only when NOBODY is left unsigned. Today that is usually one
 * person; the rule is already the multi-party one, so adding a counter-party is
 * a row rather than a rewrite.
 *
 * Does not save: the caller owns the document and may have more to write.
 */
export async function applySignature(
  doc: Signable,
  userId: string,
  clean: CleanSignature
): Promise<void> {
  const user = await UserModel.findById(userId).select('auth.email');
  const email = String((user as any)?.auth?.email ?? '');
  const mine = doc.signatories.find(
    (s) => String(s.user_id ?? '') === String(userId) || (!!email && s.email === email)
  );
  const now = new Date();
  const filled = {
    user_id: new Types.ObjectId(userId),
    ...clean,
    email,
    signed_at: now,
  };
  if (mine) Object.assign(mine, filled);
  else doc.signatories.push(filled as any);

  // Finalised only when nobody is still owed a signature.
  const outstanding = doc.signatories.some((s) => !s.signed_at);
  if (!outstanding) doc.signed_at = now;
}

/** The signature block, as every signable record reports it over GraphQL. */
export function signatoriesToPub(signatories: Types.DocumentArray<ISignatory>) {
  return [...signatories].map((s) => ({
    id: s._id.toString(),
    full_name: s.full_name ?? '',
    designation: s.designation ?? '',
    email: s.email ?? '',
    initials: s.initials ?? '',
    signature_image: s.signature_image ?? '',
    signature_method: s.signature_method ?? null,
    signed_at: s.signed_at ? s.signed_at.toISOString() : null,
  }));
}

/** What the PDF renderer needs from each signatory. */
export function signatoriesForPdf(signatories: Types.DocumentArray<ISignatory>) {
  return [...signatories].map((s) => ({
    full_name: s.full_name,
    designation: s.designation,
    initials: s.initials,
    signature_image: s.signature_image,
    signed_at: s.signed_at,
  }));
}

/** Refuse an address the mail server would only bounce. */
export function assertRecipient(to: string): string {
  const recipient = String(to ?? '').trim();
  // Length first: the pattern backtracks quadratically on a long string that
  // never matches, and `to` is unbounded user input. 254 is the RFC 5321 cap.
  if (recipient.length > 254 || !/^\S+@\S+\.\S+$/.test(recipient)) {
    fail('BAD_USER_INPUT', 'Enter a valid email address');
  }
  return recipient;
}
