import { logs } from '@observability/log';
import { fetchOpenGraph } from '@utils/open-graph';
import { findInstagramDuplicates, findLeadDuplicates } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { emailVerificationService } from '@modules/crm/emailVerification/emailVerification.service';
import { checkAndRecord } from '@modules/crm/emailVerification/emailVerification.check';
import { discoveryReader } from '@modules/crm/marketing/igLeads/igLead.discovery';
import { searchPlaces, serperReady, type PlaceHit } from '@modules/crm/marketing/igLeads/igLead.serper';
import type { DiscoveredProfile } from '@modules/crm/marketing/igLeads/igLead.types';
import { LEAD_LABELS } from '@modules/crm/crm/leadModels';
import type { LeadFacts } from './leadQuality.lead';
import type { AutoCheck, EvidenceStatus, QualityItem } from './leadQuality.rules';

/**
 * The automatic checks: each one reads a real source and says VERIFIED or
 * FAILED only when that source settles it — anything less is PENDING with a
 * note saying why, never a guess. Database checks (CRM uniqueness, the Email
 * Verifier's records) always run; checks that call out (Instagram, Google
 * Maps, the website) run only when asked, because they spend API quota.
 */

export interface CheckOutcome {
  status: EvidenceStatus;
  evidence: string;
  source_url: string;
}

export interface CheckRun {
  /** By item key. An item with no outcome keeps whatever it had. */
  outcomes: Map<string, CheckOutcome>;
  /** Checks that could not run, and why — shown to the person, never swallowed. */
  skipped: string[];
}

export interface CheckOptions {
  /** Also run the checks that call Instagram, Google Maps or the lead's website. */
  external: boolean;
  /** Who the Email Verifier records the check against. */
  actor: { id: string; email: string };
  now?: Date;
  /** Sources a discovery step already read (the profile or listing it found), so they are not paid for twice. */
  prefetched?: { instagram?: DiscoveredProfile | null; place?: PlaceHit | null };
}

const LOG = 'lead-quality';
const DAY_MS = 86_400_000;
const NAME_MATCH_SHARE = 0.6;
const EMAILS_CHECKED_LIVE = 2;

const EXTERNAL: readonly AutoCheck[] = [
  'INSTAGRAM_BUSINESS_PROFILE',
  'INSTAGRAM_FOLLOWERS_MIN',
  'INSTAGRAM_RECENT_POST_DAYS',
  'GOOGLE_MAPS_LISTING',
  'GOOGLE_REVIEWS_MIN',
  'WEBSITE_REACHABLE',
];

export const isExternalCheck = (check: AutoCheck): boolean => EXTERNAL.includes(check);

const outcome = (status: EvidenceStatus, evidence: string, source_url = ''): CheckOutcome => ({ status, evidence, source_url });
const profileUrl = (handle: string) => `https://www.instagram.com/${handle}/`;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const tokens = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3);

/** True when most of the lead's name words appear in a listing title ("The Barn Cafe" ~ "Barn Cafe & Bistro"). */
export function namesMatch(name: string, title: string): boolean {
  const wanted = tokens(name);
  if (wanted.length === 0) return false;
  const have = new Set(tokens(title));
  return wanted.filter((token) => have.has(token)).length / wanted.length >= NAME_MATCH_SHARE;
}

/** Each source is read at most once per run, however many items use it. */
function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= load();
    return pending;
  };
}

type Unavailable = { unavailable: string };
const isUnavailable = (value: unknown): value is Unavailable =>
  typeof value === 'object' && value !== null && 'unavailable' in value;

function sources(facts: LeadFacts, options: CheckOptions) {
  return {
    duplicates: memo(async () => {
      const self = { entity_type: facts.entity_type, id: facts.id };
      const [contacts, instagram] = await Promise.all([
        findLeadDuplicates({ contacts: facts.emails.map((email) => ({ email })).concat(facts.phones.map((mobile_number) => ({ mobile_number, email: '' }))), website: facts.website }, self),
        facts.instagram_handle ? findInstagramDuplicates(facts.instagram_handle, self) : Promise.resolve([]),
      ]);
      return { contacts, instagram };
    }),
    emails: memo(() => emailVerificationService.statuses(facts.emails)),
    instagram: memo(async (): Promise<DiscoveredProfile | null | Unavailable> => {
      if (options.prefetched?.instagram) return options.prefetched.instagram;
      const reader = await discoveryReader();
      if (!reader) return { unavailable: 'Instagram checks need a connected Instagram business account (Marketing › Social Accounts).' };
      return reader.read(facts.instagram_handle);
    }),
    place: memo(async (): Promise<PlaceHit | null | Unavailable> => {
      if (options.prefetched?.place) return options.prefetched.place;
      if (!(await serperReady()))return { unavailable: 'Google Maps checks need the Serper API key (Tech › Environment).' };
      const hits = await searchPlaces([facts.name, facts.area, facts.city].filter(Boolean).join(' '));
      return hits.find((hit) => namesMatch(facts.name, hit.title)) ?? null;
    }),
    website: memo(() => fetchOpenGraph(/^https?:\/\//i.test(facts.website) ? facts.website : `https://${facts.website}`)),
  };
}

type Sources = ReturnType<typeof sources>;

async function uniqueness(facts: LeadFacts, src: Sources): Promise<CheckOutcome | null> {
  if (facts.emails.length + facts.phones.length === 0 && !facts.website && !facts.instagram_handle) return null;
  const { contacts, instagram } = await src.duplicates();
  const first = contacts[0];
  if (first) {
    return outcome('FAILED', `${first.field} ${first.value} is already on ${LEAD_LABELS[first.entity_type]} "${first.lead_name}" (${first.lead_id}).`);
  }
  const other = instagram[0];
  if (other) {
    return outcome('FAILED', `Instagram @${facts.instagram_handle} is already on ${LEAD_LABELS[other.entity_type]} "${other.lead_name}" (${other.lead_id}).`, profileUrl(facts.instagram_handle));
  }
  return outcome('VERIFIED', 'No other CRM lead of any type shares its phone, email, website or Instagram profile.');
}

async function emailDeliverable(facts: LeadFacts, src: Sources, options: CheckOptions): Promise<CheckOutcome | null> {
  if (facts.emails.length === 0) return null;
  let rows = await src.emails();
  const unchecked = facts.emails.filter((email) => !rows.some((row) => row.email === email));
  if (options.external && unchecked.length > 0 && !rows.some((row) => row.status === 'VERIFIED')) {
    await Promise.all(unchecked.slice(0, EMAILS_CHECKED_LIVE).map((email) => checkAndRecord(email, options.actor, 'SINGLE')));
    rows = await emailVerificationService.statuses(facts.emails);
  }
  const verified = rows.find((row) => row.status === 'VERIFIED');
  if (verified) return outcome('VERIFIED', `${verified.email} was verified deliverable by the Email Verifier on ${verified.checked_at.slice(0, 10)}.`);
  const allInvalid = rows.length === facts.emails.length && rows.every((row) => row.status === 'INVALID');
  if (allInvalid) return outcome('FAILED', `The Email Verifier found every email on this lead undeliverable (${facts.emails.join(', ')}).`);
  return null;
}

function instagramOutcome(check: AutoCheck, threshold: number, profile: DiscoveredProfile, now: Date): CheckOutcome {
  const url = profileUrl(profile.username);
  if (check === 'INSTAGRAM_BUSINESS_PROFILE') {
    return outcome('VERIFIED', `@${profile.username} is a readable Instagram business/creator account "${profile.name}" with ${profile.followers ?? '?'} followers and ${profile.media_count ?? '?'} posts.`, url);
  }
  if (check === 'INSTAGRAM_FOLLOWERS_MIN') {
    if (profile.followers === null) return outcome('PENDING', `Instagram did not report a follower count for @${profile.username}.`, url);
    const met = profile.followers >= threshold;
    return outcome(met ? 'VERIFIED' : 'FAILED', `@${profile.username} has ${profile.followers} followers (needs ${threshold}).`, url);
  }
  if (!profile.last_post_at) {
    const none = profile.media_count === 0;
    return outcome(none ? 'FAILED' : 'PENDING', none ? `@${profile.username} has no posts.` : `Instagram did not report the latest post of @${profile.username}.`, url);
  }
  const ageDays = Math.floor((now.getTime() - new Date(profile.last_post_at).getTime()) / DAY_MS);
  return outcome(ageDays <= threshold ? 'VERIFIED' : 'FAILED', `@${profile.username} last posted ${ageDays} days ago (needs within ${threshold}).`, profile.last_post_url || url);
}

async function instagramCheck(check: AutoCheck, item: QualityItem, facts: LeadFacts, src: Sources, skipped: Set<string>, now: Date): Promise<CheckOutcome | null> {
  if (!facts.instagram_handle) return null;
  const profile = await src.instagram();
  if (isUnavailable(profile)) {
    skipped.add(profile.unavailable);
    return null;
  }
  if (!profile) {
    return outcome('PENDING', `Instagram did not return @${facts.instagram_handle} as a business or creator account; check it by hand.`, profileUrl(facts.instagram_handle));
  }
  return instagramOutcome(check, item.threshold ?? 0, profile, now);
}

async function placeCheck(check: AutoCheck, item: QualityItem, facts: LeadFacts, src: Sources, skipped: Set<string>): Promise<CheckOutcome | null> {
  if (!facts.name) return null;
  const place = await src.place();
  if (isUnavailable(place)) {
    skipped.add(place.unavailable);
    return null;
  }
  if (!place) return outcome('PENDING', `No Google Maps listing matching "${facts.name}" was found in ${facts.city || 'the search'}.`);
  const summary = `Google Maps lists "${place.title}"${place.address ? ` at ${place.address}` : ''}${place.rating_count === null ? '' : ` with ${place.rating_count} reviews (${place.rating ?? '?'}★)`}.`;
  if (check === 'GOOGLE_MAPS_LISTING') return outcome('VERIFIED', summary, place.maps_url);
  const threshold = item.threshold ?? 0;
  if (place.rating_count === null) return outcome('PENDING', `${summary} Google did not report a review count.`, place.maps_url);
  return outcome(place.rating_count >= threshold ? 'VERIFIED' : 'FAILED', `${summary} Needs ${threshold} reviews.`, place.maps_url);
}

async function websiteCheck(facts: LeadFacts, src: Sources): Promise<CheckOutcome | null> {
  if (!facts.website) return null;
  const page = await src.website();
  const title = page.title ?? page.site_name ?? page.description;
  if (title) return outcome('VERIFIED', `The website answered with the page "${title.slice(0, 120)}".`, facts.website);
  return outcome('PENDING', 'The website did not answer with a readable page; check it by hand.', facts.website);
}

function runOne(item: QualityItem, facts: LeadFacts, src: Sources, options: CheckOptions, skipped: Set<string>): Promise<CheckOutcome | null> {
  const now = options.now ?? new Date();
  switch (item.auto_check) {
    case 'CRM_UNIQUENESS':
      return uniqueness(facts, src);
    case 'EMAIL_DELIVERABLE':
      return emailDeliverable(facts, src, options);
    case 'INSTAGRAM_BUSINESS_PROFILE':
    case 'INSTAGRAM_FOLLOWERS_MIN':
    case 'INSTAGRAM_RECENT_POST_DAYS':
      return instagramCheck(item.auto_check, item, facts, src, skipped, now);
    case 'GOOGLE_MAPS_LISTING':
    case 'GOOGLE_REVIEWS_MIN':
      return placeCheck(item.auto_check, item, facts, src, skipped);
    case 'WEBSITE_REACHABLE':
      return websiteCheck(facts, src);
    default:
      return Promise.resolve(null);
  }
}

/** Run every item's automatic check that applies; external ones only when `options.external`. */
export async function runAutoChecks(facts: LeadFacts, items: readonly QualityItem[], options: CheckOptions): Promise<CheckRun> {
  const src = sources(facts, options);
  const skipped = new Set<string>();
  const outcomes = new Map<string, CheckOutcome>();
  const runnable = items.filter((item) => item.auto_check !== 'NONE' && (options.external || !isExternalCheck(item.auto_check)));
  for (const item of runnable) {
    try {
      const result = await runOne(item, facts, src, options, skipped);
      if (result) outcomes.set(item.key, result);
    } catch (error) {
      logs.server.warn(LOG, 'check', { error, check: item.auto_check, entity_type: facts.entity_type, lead_id: facts.id });
      skipped.add(`${item.name}: the ${item.auto_check} check failed (${messageOf(error).slice(0, 160)}).`);
    }
  }
  return { outcomes, skipped: [...skipped] };
}
