import crypto from 'node:crypto';
import { Schema, model, type Document } from 'mongoose';

/**
 * Thirteen months. The GDPR asks for a stated limit rather than a specific
 * number, and thirteen is what lets a marketer compare this October with last
 * October — the shortest window that still answers the question the analytics
 * exist for.
 */
export const DEFAULT_RETENTION_DAYS = 395;
export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 1095;

/** A fresh salt makes every hash written before it unlinkable to a new one. */
export const newIpSalt = () => crypto.randomBytes(32).toString('hex');

export interface IShortLinkPolicy extends Document {
  /** Singleton. */
  key: string;
  /** Hosts a short link may never point at, each covering its subdomains. */
  blocked_domains: string[];
  /** Clicks older than this are deleted by the retention sweep. */
  retention_days: number;
  /**
   * Whether a visitor's Do-Not-Track / Global-Privacy-Control signal is
   * obeyed. On by default; switching it off is a decision somebody makes
   * deliberately rather than a default they inherit.
   */
  honour_consent_signals: boolean;
  /**
   * The salt mixed into every stored address hash. NEVER leaves the server: an
   * unsalted SHA-256 of an IPv4 address is reversible by brute force in
   * seconds — the whole address space is under 2^32 — which would make the
   * "we never store addresses" claim untrue.
   */
  ip_hash_salt: string;
  ip_salt_rotated_at: Date;
  last_purge_at?: Date | null;
  last_purged_count: number;
  updated_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

const shortLinkPolicySchema = new Schema<IShortLinkPolicy>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    blocked_domains: { type: [String], default: [] },
    retention_days: {
      type: Number,
      default: DEFAULT_RETENTION_DAYS,
      min: MIN_RETENTION_DAYS,
      max: MAX_RETENTION_DAYS,
    },
    honour_consent_signals: { type: Boolean, default: true },
    ip_hash_salt: { type: String, required: true, default: newIpSalt },
    ip_salt_rotated_at: { type: Date, default: () => new Date() },
    last_purge_at: { type: Date, default: null },
    last_purged_count: { type: Number, default: 0, min: 0 },
    updated_by: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ShortLinkPolicyModel = model<IShortLinkPolicy>(
  'ShortLinkPolicy',
  shortLinkPolicySchema
);
