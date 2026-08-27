import { logs } from '@observability/log';
import { RateLimitRuleModel, RateLimitSystemModel, getRateLimitSettingsDoc } from './rateLimit.model';
import type { RateLimitSurface } from './rateLimit.types';

/**
 * What the console shows on a database that has never seen traffic.
 *
 * The Systems page is written by the traffic itself — every (surface, app) pair
 * that calls gets a row the first time it does — so this seed exists only so
 * the page is not blank before anybody has opened a portal, and so a system
 * carries a readable name instead of its key. A portal added after this list
 * still appears; it just names itself.
 *
 * The rules are the shipped defaults. They are created ONCE, matched on name,
 * and never overwritten: an operator who has tuned a limit keeps their number
 * across every subsequent boot.
 */

interface SeedSystem {
  surface: RateLimitSurface;
  app: string;
  label: string;
}

/** The 17 consoles, both apps, the websites and the two non-browser callers. */
const SEED_SYSTEMS: SeedSystem[] = [
  { surface: 'ADMIN_PORTAL', app: 'admin', label: 'Admin Panel' },
  { surface: 'PORTAL', app: 'ads', label: 'Ads Portal' },
  { surface: 'PORTAL', app: 'ai', label: 'AI Portal' },
  { surface: 'PORTAL', app: 'challenge', label: 'Challenges Portal' },
  { surface: 'PORTAL', app: 'crm', label: 'CRM Portal' },
  { surface: 'PORTAL', app: 'developers', label: 'Developers Portal' },
  { surface: 'PORTAL', app: 'employee', label: 'Employee Portal' },
  { surface: 'PORTAL', app: 'finance', label: 'Finance Portal' },
  { surface: 'PORTAL', app: 'hr', label: 'HR Portal' },
  { surface: 'PORTAL', app: 'legal', label: 'Legal Portal' },
  { surface: 'PORTAL', app: 'marketing', label: 'Marketing Portal' },
  { surface: 'PORTAL', app: 'onboarding', label: 'Onboarding Portal' },
  { surface: 'PORTAL', app: 'partners', label: 'Partners Portal' },
  { surface: 'PORTAL', app: 'products', label: 'Products Portal' },
  { surface: 'PORTAL', app: 'support', label: 'Support Portal' },
  { surface: 'PORTAL', app: 'tech', label: 'Tech Portal' },
  { surface: 'PORTAL', app: 'website-app', label: 'Website Portal' },
  { surface: 'MWEB', app: 'mweb', label: 'mWeb' },
  { surface: 'NATIVE', app: 'native', label: 'Mobile App' },
  { surface: 'WEBSITE', app: 'main-website', label: 'duncit.com' },
  { surface: 'WEBSITE', app: 'ads-website', label: 'Ads Website' },
  { surface: 'WEBSITE', app: 'earnwith-website', label: 'Earn With Website' },
  { surface: 'WEBSITE', app: 'partners-website', label: 'Partners Website' },
  { surface: 'WEBSITE', app: 'status-website', label: 'Status Website' },
  { surface: 'API', app: 'public-api', label: 'Public API (x-api-key)' },
  { surface: 'SERVER', app: 'server', label: 'Server / webhooks' },
  { surface: 'UNKNOWN', app: '-', label: 'Unidentified caller' },
];

/**
 * The shipped rules.
 *
 * Every broad ceiling ships in MONITOR, on purpose. Nobody knows what a normal
 * minute looks like for an office behind one address until the Systems and
 * Blocked pages have some days on them, and a limiter that starts refusing real
 * customers on the hour it deploys is a limiter somebody switches off entirely.
 * They record instead, and the console flips each one to ENFORCE once its
 * number has been checked against real traffic.
 *
 * The credential rule is the exception and ships ENFORCING: twenty sign-in
 * attempts from one address in five minutes is not a person having a bad day.
 *
 * The operation lists are GLOBS, so a sign-in mutation added next month is
 * already covered rather than quietly unprotected.
 */
const SEED_RULES = [
  {
    name: 'Global request ceiling',
    description:
      'A single address across every surface. The backstop that catches a script nobody has written a rule for yet. Ships in Monitor — check the Blocked page before enforcing.',
    priority: 10,
    mode: 'MONITOR',
    surface: 'ALL',
    app: '*',
    channel: 'ALL',
    key_by: 'IP',
    algorithm: 'SLIDING_WINDOW',
    limit: 600,
    window_seconds: 60,
    block_seconds: 0,
  },
  {
    name: 'Anonymous browsing ceiling',
    description:
      'Signed-out traffic only. Catches a scraper walking the public catalogue without ever touching a signed-in person.',
    priority: 20,
    mode: 'MONITOR',
    surface: 'ALL',
    app: '*',
    channel: 'GRAPHQL',
    audience: 'ANONYMOUS',
    key_by: 'IP',
    algorithm: 'SLIDING_WINDOW',
    limit: 240,
    window_seconds: 60,
    block_seconds: 0,
  },
  {
    name: 'Sign-in and one-time codes',
    description:
      'The credential-guessing rule. A breach starts a five-minute cool-off, because the attempt is worth nothing to a real person and everything to a script.',
    priority: 5,
    mode: 'ENFORCE',
    surface: 'ALL',
    app: '*',
    channel: 'GRAPHQL',
    operation_type: 'MUTATION',
    operations: [
      'login*',
      'register',
      'signup*',
      'request*Otp',
      '*WithOtp',
      'verify*Otp',
      'linkGoogleAccount',
    ],
    key_by: 'IP',
    algorithm: 'SLIDING_WINDOW',
    limit: 20,
    window_seconds: 300,
    block_seconds: 300,
    message: 'Too many attempts. Please wait a few minutes before trying again.',
  },
  {
    name: 'Mutation ceiling per account',
    description: 'How fast one signed-in account may write. Reads are untouched.',
    priority: 30,
    mode: 'MONITOR',
    surface: 'ALL',
    app: '*',
    channel: 'GRAPHQL',
    operation_type: 'MUTATION',
    audience: 'AUTHENTICATED',
    key_by: 'USER',
    algorithm: 'SLIDING_WINDOW',
    limit: 120,
    window_seconds: 60,
    block_seconds: 0,
  },
  {
    name: 'Uploads',
    description:
      'Files cost real storage and CPU, so they get their own, much lower ceiling — with a burst, because picking six photos at once is one action.',
    priority: 40,
    mode: 'MONITOR',
    surface: 'ALL',
    app: '*',
    channel: 'REST',
    paths: ['/upload*'],
    key_by: 'IP_USER',
    algorithm: 'TOKEN_BUCKET',
    limit: 60,
    window_seconds: 60,
    burst: 20,
    block_seconds: 0,
  },
  {
    name: 'Public API keys',
    description:
      'The venue partner API. Per KEY rather than per address, because one integration behind one address is still one integration. This one replaced a limit that was hardcoded in the middleware.',
    priority: 50,
    mode: 'ENFORCE',
    surface: 'API',
    app: '*',
    channel: 'REST',
    key_by: 'API_KEY',
    algorithm: 'SLIDING_WINDOW',
    limit: 120,
    window_seconds: 60,
    block_seconds: 0,
  },
  {
    name: 'Socket connections',
    description: 'Chat and presence handshakes. A reconnect storm is what this catches.',
    priority: 60,
    mode: 'MONITOR',
    surface: 'ALL',
    app: '*',
    channel: 'SOCKET',
    key_by: 'IP',
    algorithm: 'SLIDING_WINDOW',
    limit: 60,
    window_seconds: 60,
    block_seconds: 0,
  },
];

/** Create the singleton, the shipped rules and the system catalogue. */
export async function seedRateLimitDefaults(): Promise<void> {
  await getRateLimitSettingsDoc();

  await RateLimitSystemModel.bulkWrite(
    SEED_SYSTEMS.map((s) => ({
      updateOne: {
        filter: { surface: s.surface, app: s.app },
        // Only the label is refreshed: the counters belong to traffic, and a
        // boot must never reset them.
        update: { $set: { label: s.label }, $setOnInsert: { requests: 0, blocked: 0 } },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const existing = await RateLimitRuleModel.find({}, 'name').lean();
  const known = new Set(existing.map((r) => r.name));
  const missing = SEED_RULES.filter((r) => !known.has(r.name));
  if (missing.length === 0) return;
  await RateLimitRuleModel.insertMany(missing, { ordered: false });
  logs.server.info('rateLimit', 'seed', { created: missing.length });
}
