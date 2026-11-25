import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { logs } from '@observability/log';
import { rootAdminEmail } from '@modules/access/user/user.roles';
import { anyDelivered, otpService } from '@modules/platform/otp/otp.service';
import { EnvAccessGrantModel } from './envAccess.model';

/**
 * The second door in front of Tech → Environment Variables.
 *
 * A signed-in Tech session is not enough to read the platform's keys: the page
 * first asks for a code that is always mailed to the ROOT admin, whoever is
 * asking. Typing it unlocks THIS session (its bearer token) for a short while,
 * and every env resolver checks the unlock server-side — hiding the page
 * would protect nothing.
 *
 * One unlock serves every portal that edits the store (Tech, Marketing ›
 * Settings › Integrations, Instagram Leads' Serper key): the same person's
 * other sessions share it while they come from the same network, until it
 * expires. A token used from anywhere else still needs a code, and "Lock now"
 * ends the unlock in every portal at once.
 *
 * The code itself is the shared `otpService` one (expiry, attempt limit, single
 * use); only what a verified code opens lives here.
 */

const PURPOSE = 'ENV_ACCESS' as const;
const DEFAULT_TTL_MINUTES = 30;

const ttlMinutes = () => {
  const n = Number(process.env.ENV_ACCESS_TTL_MINUTES);
  return Number.isInteger(n) && n > 0 && n <= 240 ? n : DEFAULT_TTL_MINUTES;
};

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** The session an unlock belongs to: the caller's own bearer token, hashed. */
function sessionHash(ctx: GraphQLContext): string | null {
  const header = ctx.req?.headers?.authorization;
  if (!ctx.user?.id || typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return sha(header.slice(7));
}

/** The network the request came from (nginx is trusted, so this is the client), hashed; null when unknown. */
function networkHash(ctx: GraphQLContext): string | null {
  const ip = ctx.req?.ip;
  return typeof ip === 'string' && ip ? sha(ip) : null;
}

/** `admin@duncit.com` → `ad***@duncit.com` — enough to recognise, not to harvest. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

const locked = () =>
  new GraphQLError('Environment Variables are locked — verify the emailed code first', {
    extensions: { code: 'ENV_LOCKED' },
  });

/** This session's own unlock, else one the same person made from the same network in another portal. */
async function liveGrant(ctx: GraphQLContext) {
  const hash = sessionHash(ctx);
  if (!hash) return null;
  const now = new Date();
  const own = await EnvAccessGrantModel.findOne({ session_hash: hash, expires_at: { $gt: now } }).lean();
  if (own) return own;
  const network = networkHash(ctx);
  if (!network) return null;
  return EnvAccessGrantModel.findOne({ user_id: ctx.user?.id, ip_hash: network, expires_at: { $gt: now } }).lean();
}

export const envAccessService = {
  async status(ctx: GraphQLContext) {
    const grant = await liveGrant(ctx);
    return {
      unlocked: !!grant,
      expires_at: grant ? grant.expires_at.toISOString() : null,
      sent_to: maskEmail(rootAdminEmail()),
    };
  },

  /** Throws ENV_LOCKED unless this session typed the root admin's code recently. */
  async require(ctx: GraphQLContext): Promise<void> {
    if (!(await liveGrant(ctx))) throw locked();
  },

  /** Mail a fresh code to the root admin. */
  async request(ctx: GraphQLContext) {
    if (!sessionHash(ctx)) throw locked();
    const issued = await otpService.request({
      purpose: PURPOSE,
      mediums: ['EMAIL'],
      email: rootAdminEmail(),
      recipient_name: '',
      context: { user_id: ctx.user?.id },
      requested_by: ctx.user?.id,
    });
    if (!anyDelivered(issued.deliveries)) {
      const reason = issued.deliveries.map((d) => d.reason).filter(Boolean).join('; ');
      logs.server.warn('envAccess.service', 'request', { msg: 'access code not delivered', reason });
      throw new GraphQLError('The access code could not be emailed. Check the Email (SMTP) entry and try again.', {
        extensions: { code: 'SERVICE_UNAVAILABLE' },
      });
    }
    logs.server.info('envAccess.service', 'request', { msg: 'access code sent', user_id: ctx.user?.id });
    return {
      challenge_id: issued.challenge_id,
      expires_at: issued.expires_at,
      resend_after_seconds: issued.resend_after_seconds,
      sent_to: maskEmail(rootAdminEmail()),
    };
  },

  /** Check the code, spend it, and unlock this session. */
  async verify(ctx: GraphQLContext, challengeId: string, code: string) {
    const hash = sessionHash(ctx);
    if (!hash) throw locked();
    const challenge = await otpService.verify(challengeId, code);
    // The code is the root admin's; it unlocks the session that asked for it.
    await otpService.consume(String(challenge._id), {
      purpose: PURPOSE,
      match: (c) => String(c.requested_by ?? '') === ctx.user?.id,
    });
    const expires_at = new Date(Date.now() + ttlMinutes() * 60_000);
    await EnvAccessGrantModel.findOneAndUpdate(
      { session_hash: hash },
      { $set: { user_id: ctx.user?.id, expires_at, ip_hash: networkHash(ctx) ?? '' } },
      { upsert: true }
    );
    logs.server.info('envAccess.service', 'verify', {
      msg: 'environment variables unlocked',
      user_id: ctx.user?.id,
      expires_at: expires_at.toISOString(),
    });
    return this.status(ctx);
  },

  /** End the unlock early ("Lock now") — in every portal, since they share it. */
  async lock(ctx: GraphQLContext) {
    // Only a signed-in session with a token can lock (sessionHash needs both); its own grant is among these.
    if (sessionHash(ctx)) await EnvAccessGrantModel.deleteMany({ user_id: ctx.user?.id });
    return this.status(ctx);
  },
};
