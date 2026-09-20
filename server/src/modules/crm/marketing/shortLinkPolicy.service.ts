import { GraphQLError } from 'graphql';
import {
  DEFAULT_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  ShortLinkPolicyModel,
  newIpSalt,
  type IShortLinkPolicy,
} from './shortLinkPolicy.model';
import { normaliseBlockedDomain } from './shortLink.destination';
import { CONSENT_SIGNALS, ShortLinkClickModel } from './shortLinkClick.model';

/**
 * The one place that answers "what are we allowed to store, and for how long".
 *
 * Read on the redirect path — once per click — so it is cached. A minute of
 * staleness is the right trade: turning consent signals on should take effect
 * promptly, but not at the price of a database round trip in front of every
 * visitor.
 */
const CACHE_MS = 60_000;

let cached: { at: number; doc: IShortLinkPolicy } | null = null;

const MS_PER_DAY = 86_400_000;

/** The singleton, created on first read so no boot seed is required. */
async function load(): Promise<IShortLinkPolicy> {
  const doc = await ShortLinkPolicyModel.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc;
}

async function current(): Promise<IShortLinkPolicy> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.doc;
  const doc = await load();
  cached = { at: Date.now(), doc };
  return doc;
}

const forget = () => {
  cached = null;
};

export interface ShortLinkPrivacyRules {
  blocked_domains: string[];
  retention_days: number;
  honour_consent_signals: boolean;
  ip_hash_salt: string;
}

/** The cutoff a retention sweep deletes below. */
const cutoffFor = (retentionDays: number) => new Date(Date.now() - retentionDays * MS_PER_DAY);

/** The shape the console reads. The salt is deliberately absent. */
async function view(doc: IShortLinkPolicy) {
  const cutoff = cutoffFor(doc.retention_days);
  const [clicks_stored, clicks_beyond_retention, consent_minimised] = await Promise.all([
    ShortLinkClickModel.countDocuments({}).exec(),
    ShortLinkClickModel.countDocuments({ clicked_at: { $lt: cutoff } }).exec(),
    // $in over the two stored values rather than $ne: null — only the former
    // can use the partial index behind consent_signal.
    ShortLinkClickModel.countDocuments({ consent_signal: { $in: [...CONSENT_SIGNALS] } }).exec(),
  ]);
  return {
    blocked_domains: doc.blocked_domains,
    retention_days: doc.retention_days,
    honour_consent_signals: doc.honour_consent_signals,
    ip_salt_rotated_at: doc.ip_salt_rotated_at.toISOString(),
    last_purge_at: doc.last_purge_at ? doc.last_purge_at.toISOString() : null,
    last_purged_count: doc.last_purged_count,
    retention_cutoff: cutoff.toISOString(),
    clicks_stored,
    clicks_beyond_retention,
    consent_minimised,
    updated_at: doc.updated_at.toISOString(),
  };
}

function checkRetention(days: number) {
  if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
    throw new GraphQLError(
      `Retention has to be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS} days`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/**
 * Blocked domains arrive as whatever a marketer pasted — a bare host, a full
 * URL, a `www.` prefix. Each is reduced to the host it names; anything that
 * names none is dropped rather than stored as a rule that can never match.
 */
function cleanDomains(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const entry of raw) {
    const domain = normaliseBlockedDomain(entry);
    if (domain) seen.add(domain);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export interface ShortLinkPolicyInput {
  blocked_domains?: string[] | null;
  retention_days?: number | null;
  honour_consent_signals?: boolean | null;
}

export const shortLinkPolicyService = {
  DEFAULT_RETENTION_DAYS,

  /** What the click recorder needs, without exposing the document. */
  async rules(): Promise<ShortLinkPrivacyRules> {
    const doc = await current();
    return {
      blocked_domains: doc.blocked_domains,
      retention_days: doc.retention_days,
      honour_consent_signals: doc.honour_consent_signals,
      ip_hash_salt: doc.ip_hash_salt,
    };
  },

  async read() {
    return view(await current());
  },

  async update(input: ShortLinkPolicyInput, by?: string | null) {
    const doc = await load();
    if (input.retention_days != null) {
      checkRetention(input.retention_days);
      doc.retention_days = input.retention_days;
    }
    if (input.blocked_domains) doc.blocked_domains = cleanDomains(input.blocked_domains);
    if (input.honour_consent_signals != null) {
      doc.honour_consent_signals = input.honour_consent_signals;
    }
    doc.updated_by = by ?? null;
    await doc.save();
    forget();
    return view(doc);
  },

  /**
   * Rotate the hashing salt.
   *
   * This is the strongest erasure available: every address hash written under
   * the old salt stops being comparable to anything written after it, so a
   * visitor recorded yesterday can never again be recognised as the same
   * visitor. The cost is that unique-visitor counts split across the rotation,
   * which is the honest price of the guarantee.
   */
  async rotateIpSalt(by?: string | null) {
    const doc = await load();
    doc.ip_hash_salt = newIpSalt();
    doc.ip_salt_rotated_at = new Date();
    doc.updated_by = by ?? null;
    await doc.save();
    forget();
    return view(doc);
  },

  /** Delete every click older than the retention window. Returns how many. */
  async purge(by?: string | null) {
    const doc = await load();
    const result = await ShortLinkClickModel.deleteMany({
      clicked_at: { $lt: cutoffFor(doc.retention_days) },
    }).exec();
    doc.last_purge_at = new Date();
    doc.last_purged_count = result.deletedCount ?? 0;
    if (by) doc.updated_by = by;
    await doc.save();
    forget();
    return doc.last_purged_count;
  },
};

/** Test seam — the cache would otherwise outlive a suite's own fixtures. */
export const __resetShortLinkPolicyCache = forget;
