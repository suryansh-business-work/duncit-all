import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { escapeRegExp } from '@utils/regex';

/**
 * Small pieces every part of the pet store shares: who may run it, how a
 * shopper is identified, and the error shapes the storefront reads.
 */

/** The ecomm portal's operators. SUPER_ADMIN always passes requireRole. */
export const STORE_ADMIN_ROLES = ['SUPER_ADMIN', 'ECOMM_MANAGER'] as const;

export const requireStoreAdmin = (ctx: GraphQLContext) => requireRole(ctx, STORE_ADMIN_ROLES);

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function notFound(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}

export function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** `Dry Food & Treats!` → `dry-food-treats`. Used for every public URL key. */
export function slugify(value: string): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean)
    .join('-')
    .slice(0, 120);
}

/** Only well-formed ids, as ObjectIds. A malformed id is dropped, never thrown on. */
export function toObjectIds(ids: readonly unknown[] | null | undefined): Types.ObjectId[] {
  return (ids ?? [])
    .map((id) => String(id ?? ''))
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
}

export function toObjectId(id: unknown): Types.ObjectId | null {
  const value = String(id ?? '');
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

/** A guest token the storefront minted with crypto.randomUUID (or longer). */
const GUEST_TOKEN = /^[\w-]{24,80}$/;

/** Whose cart / wishlist this is: the signed-in account, else the guest's token. */
export interface StoreOwner {
  owner_key: string;
  user_id: Types.ObjectId | null;
}

export function resolveOwner(ctx: GraphQLContext, cartToken?: string | null): StoreOwner {
  if (ctx.user?.id && Types.ObjectId.isValid(ctx.user.id)) {
    return { owner_key: `u:${ctx.user.id}`, user_id: new Types.ObjectId(ctx.user.id) };
  }
  const token = String(cartToken ?? '').trim();
  if (!GUEST_TOKEN.test(token)) badInput('Your cart session has expired — refresh the page');
  return { owner_key: `g:${token}`, user_id: null };
}

/** The guest owner key for a token, when one was sent — used to merge on sign-in. */
export function guestKeyOf(cartToken?: string | null): string | null {
  const token = String(cartToken ?? '').trim();
  return GUEST_TOKEN.test(token) ? `g:${token}` : null;
}

/** A random, unguessable secret (hex). */
export const secretKey = (bytes = 24) => crypto.randomBytes(bytes).toString('hex');

/** Constant-time string equality for secrets. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Escape user text for a case-insensitive `RegExp`. */
export function searchRegex(text: string): RegExp {
  return new RegExp(escapeRegExp(String(text ?? '')), 'i');
}

/** Clean a list of free-text strings: trimmed, non-empty, de-duplicated, capped. */
export function cleanList(values: readonly unknown[] | null | undefined, max = 50): string[] {
  const seen = new Set<string>();
  for (const value of values ?? []) {
    const text = String(value ?? '').trim();
    if (text) seen.add(text);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** Numbers from an input: finite and non-negative, else the fallback. */
export function nonNegative(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
