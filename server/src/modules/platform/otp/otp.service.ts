import { GraphQLError } from 'graphql';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PHONE_EXTENSION_REGEX, PHONE_NUMBER_REGEX } from '@utils/phone';
import { commPreferenceService } from '@modules/access/commPreference/commPreference.service';
import { deliverOtp } from './otp.delivery';
import {
  isPhoneMedium,
  OTP_MEDIUMS,
  OtpChallengeModel,
  type IOtpChallenge,
  type IOtpDelivery,
  type OtpMedium,
  type OtpPurpose,
} from './otp.model';

/** How long a code stays usable. */
const TTL_MS = 10 * 60 * 1000;
/** Wrong guesses allowed before the challenge is burnt. */
const MAX_ATTEMPTS = 5;
/** Seconds between two sends on the same challenge. */
const RESEND_COOLDOWN_SEC = 30;
const CODE_LENGTH = 6;

/**
 * The code every stubbed challenge uses.
 *
 * Not a backdoor: it is only ever the answer while `deliverOtp` cannot actually
 * transmit, and in that case the server hands it straight back to the client to
 * type in. The moment ONE medium genuinely sends, the code is random and this
 * constant is unreachable.
 */
const TEST_CODE = process.env.OTP_TEST_CODE || '123456';

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** A cryptographically random numeric code of CODE_LENGTH digits. */
function randomCode(): string {
  const max = 10 ** CODE_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(CODE_LENGTH, '0');
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** `+91` / `9876543210`, rejected rather than guessed at. */
export function normalizePhone(extension: unknown, number: unknown) {
  const rawExt = String(extension ?? '').trim().replaceAll(/[^\d+]/g, '');
  const digits = String(number ?? '').trim().replaceAll(/\D/g, '');
  // The ONE definition of these two shapes lives in @utils/phone (rule 34).
  if (!PHONE_EXTENSION_REGEX.test(rawExt)) throw badInput('Country code is required');
  if (!PHONE_NUMBER_REGEX.test(digits)) throw badInput('Enter a valid phone number');
  return {
    phone_extension: rawExt.startsWith('+') ? rawExt : `+${rawExt}`,
    phone_number: digits,
  };
}

/** Deliberately lenient — the shape a mailbox must have to be worth sending to,
 * not a second opinion on what the account collection already accepted. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The mailbox a code is addressed to, rejected rather than guessed at. */
export function normalizeEmail(email: unknown): string {
  const value = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_SHAPE.test(value)) throw badInput('Enter a valid email address');
  return value;
}

/**
 * Where a code is going.
 *
 * A phone pair OR a mailbox — never both, and which one is decided by the
 * mediums asked for. Password recovery is the flow that made this necessary:
 * the same purpose, the same expiry, the same attempt limit, reached from two
 * channels the person chooses between.
 */
export interface OtpTarget {
  phone_extension?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

/** What a challenge is stored and found by. */
interface NormalizedTarget {
  phone_extension: string;
  phone_number: string;
  email: string;
}

/**
 * Validate the destination the requested mediums actually need.
 *
 * Asked per medium rather than "whatever was supplied": a WhatsApp send with a
 * mailbox and no number would otherwise be issued and then silently fail to
 * deliver, and the person would be left waiting for a code nothing sent.
 */
export function normalizeTarget(
  target: Readonly<OtpTarget>,
  mediums: readonly OtpMedium[]
): NormalizedTarget {
  const phone = mediums.some(isPhoneMedium)
    ? normalizePhone(target.phone_extension, target.phone_number)
    : { phone_extension: '', phone_number: '' };
  const email = mediums.includes('EMAIL') ? normalizeEmail(target.email) : '';
  return { ...phone, email };
}

/** The ONE field a challenge is looked up by: its mailbox, or its number. */
const targetFilter = (target: Readonly<NormalizedTarget>) =>
  target.email ? { email: target.email } : { phone_number: target.phone_number };

/** Only the mediums this platform knows, de-duplicated, never empty. */
function cleanMediums(requested: readonly unknown[] | null | undefined): OtpMedium[] {
  const known = new Set<string>(OTP_MEDIUMS);
  const picked = [...new Set((requested ?? []).map(String))].filter((m) =>
    known.has(m)
  ) as OtpMedium[];
  if (picked.length === 0) throw badInput('Choose at least one way to send the code');
  return picked;
}

export interface OtpRequestInput extends OtpTarget {
  purpose: OtpPurpose;
  /** SMS, WhatsApp, email, or several — the medium IS a parameter, never a
   * second method. */
  mediums: readonly string[];
  /** The name being proven alongside the number, when the flow proves one. */
  recipient_name?: string | null;
  /** Binds the proof to what asked for it (e.g. pod + membership). */
  context?: Record<string, unknown>;
  requested_by?: string | null;
}

export interface PhoneOtpRequestResult {
  challenge_id: string;
  expires_at: string;
  /** Every medium that was asked, with what actually happened to it. */
  deliveries: IOtpDelivery[];
  /** Seconds the caller must wait before asking for another code. */
  resend_after_seconds: number;
  /**
   * The code, echoed back, ONLY while no medium could really carry it. Null the
   * moment a transport is wired — a client must not depend on reading it.
   */
  test_code: string | null;
}

/** True when nothing actually left the building, so the code must be shown. */
const nothingDelivered = (deliveries: readonly IOtpDelivery[]) =>
  deliveries.every((d) => d.status !== 'SENT');

/** Throws unless the cooldown since the last send on this challenge has passed. */
function assertResendAllowed(previous: IOtpChallenge | null) {
  if (!previous) return;
  const elapsed = Date.now() - previous.last_sent_at.getTime();
  const waitMs = RESEND_COOLDOWN_SEC * 1000 - elapsed;
  if (waitMs > 0) {
    throw new GraphQLError(
      `Wait ${Math.ceil(waitMs / 1000)}s before asking for another code`,
      { extensions: { code: 'TOO_MANY_REQUESTS' } }
    );
  }
}

/** The newest challenge for this purpose + number that is still usable. */
function findLive(purpose: OtpPurpose, phone_number: string) {
  return OtpChallengeModel.findOne({
    purpose,
    phone_number,
    consumed_at: null,
    expires_at: { $gt: new Date() },
  }).sort({ created_at: -1 });
}

/**
 * The one way Duncit issues and checks a one-time code.
 *
 * Every flow that needs a phone proved — attendance at the door, the WhatsApp
 * number on signup, anything after them — goes through here and passes the
 * medium as an argument. There is deliberately no second phone `verifyOtp`
 * anywhere: a duplicated one drifts on exactly the parts that matter (expiry,
 * attempt limit, single use) and each copy has to be fixed separately.
 *
 * Not folded in yet: the EMAIL codes in `user.service` still keep their own
 * hash/expiry pair per purpose on the user document. They are a different
 * medium family with a far wider blast radius (sign-in, password reset,
 * account deletion), so consolidating them is its own change — this is the
 * home they would move into.
 */
export const otpService = {
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SEC,

  /** Issue a code and fan it out over every requested medium. */
  async request(input: Readonly<OtpRequestInput>): Promise<PhoneOtpRequestResult> {
    const asked = cleanMediums(input.mediums);
    const phone = normalizePhone(input.phone_extension, input.phone_number);

    // Honour the CHANNEL preference of whoever owns the number, which at a pod
    // door is the attendee rather than the host who pressed the button. A
    // number with no account behind it keeps every medium the caller asked
    // for. Refusing when nothing survives is deliberate: sending on a channel
    // somebody switched off would make the switch a lie.
    const allowed = new Set(
      await commPreferenceService.allowedPhoneMediums(phone.phone_number, asked)
    );
    const mediums = asked.filter((medium) => allowed.has(medium));
    if (mediums.length === 0) {
      throw new GraphQLError(
        'This number has switched off one-time codes on every channel we could use.',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }

    // Re-asking replaces the previous code rather than stacking a second live
    // one, so "the last SMS" is always the only one that works.
    const previous = await findLive(input.purpose, phone.phone_number);
    assertResendAllowed(previous);

    const recipient_name = String(input.recipient_name ?? '').trim();
    // Provisional: the real code depends on whether anything could carry it.
    const candidate = randomCode();
    const deliveries = await Promise.all(
      mediums.map((medium) =>
        deliverOtp({ medium, ...phone, recipient_name, code: candidate, purpose: input.purpose })
      )
    );
    const stubbed = nothingDelivered(deliveries);
    const code = stubbed ? TEST_CODE : candidate;

    const expires_at = new Date(Date.now() + TTL_MS);
    const doc = await OtpChallengeModel.findOneAndUpdate(
      { _id: previous?._id ?? new Types.ObjectId() },
      {
        $set: {
          purpose: input.purpose,
          mediums,
          deliveries,
          ...phone,
          recipient_name,
          code_hash: sha(code),
          expires_at,
          // A fresh code deserves a fresh allowance; otherwise a resend
          // inherits the guesses already spent on the old one.
          attempts: 0,
          verified_at: null,
          consumed_at: null,
          last_sent_at: new Date(),
          context: input.context ?? {},
          requested_by: input.requested_by ?? null,
        },
      },
      { new: true, upsert: true }
    );

    return {
      challenge_id: String(doc._id),
      expires_at: expires_at.toISOString(),
      deliveries,
      resend_after_seconds: RESEND_COOLDOWN_SEC,
      test_code: stubbed ? code : null,
    };
  },

  /**
   * Check a code against a named challenge and mark it verified.
   *
   * Every rejection costs an attempt, including a bad code on a challenge that
   * was already verified — otherwise an unlimited number of guesses is
   * available the moment somebody gets one right.
   */
  async verify(challengeId: string, code: string): Promise<IOtpChallenge> {
    const doc = await OtpChallengeModel.findById(challengeId).catch(() => null);
    if (!doc) throw badInput('That code request has expired — send a new one');
    return this.check(doc, code);
  },

  /** Verify against the newest live challenge for a purpose + number. */
  async verifyLatest(
    purpose: OtpPurpose,
    extension: string,
    number: string,
    code: string
  ): Promise<IOtpChallenge> {
    const phone = normalizePhone(extension, number);
    const doc = await findLive(purpose, phone.phone_number);
    if (!doc) throw badInput('That code request has expired — send a new one');
    return this.check(doc, code);
  },

  /** The shared gate both verify paths run. */
  async check(doc: IOtpChallenge, code: string): Promise<IOtpChallenge> {
    if (doc.consumed_at) throw badInput('That code has already been used');
    if (doc.expires_at.getTime() <= Date.now()) {
      throw badInput('That code has expired — send a new one');
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      throw new GraphQLError('Too many wrong codes — send a new one', {
        extensions: { code: 'TOO_MANY_REQUESTS' },
      });
    }
    const supplied = String(code ?? '').trim();
    if (!supplied || sha(supplied) !== doc.code_hash) {
      doc.attempts += 1;
      await doc.save();
      const left = Math.max(MAX_ATTEMPTS - doc.attempts, 0);
      throw badInput(left > 0 ? `Incorrect code — ${left} attempts left` : 'Incorrect code');
    }
    doc.verified_at = new Date();
    await doc.save();
    return doc;
  },

  /**
   * Spend a verified challenge.
   *
   * Separate from `verify` because the two happen at different moments: the
   * host proves the number, then presses Mark attendance. Single use is the
   * point — one proof must mark one person.
   */
  async consume(
    challengeId: string,
    expected: Readonly<{ purpose: OtpPurpose; match?: (c: IOtpChallenge) => boolean }>
  ): Promise<IOtpChallenge> {
    const doc = await OtpChallengeModel.findById(challengeId).catch(() => null);
    if (doc?.purpose !== expected.purpose) throw badInput('Verify the phone number first');
    if (!doc.verified_at) throw badInput('Verify the phone number first');
    if (doc.consumed_at) throw badInput('That verification has already been used');
    if (doc.expires_at.getTime() <= Date.now()) {
      throw badInput('That verification has expired — verify the number again');
    }
    if (expected.match && !expected.match(doc)) {
      throw badInput('That verification was for a different person');
    }
    doc.consumed_at = new Date();
    await doc.save();
    logs.server.info('otp.service', 'consume', {
      msg: 'one-time code spent',
      purpose: doc.purpose,
      challenge_id: String(doc._id),
    });
    return doc;
  },
};
