import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { askForJson, stringList, text } from '../social/social.llm';
import { IgLeadModel, IgLeadSearchModel } from './igLead.model';
import { searchProfiles, serperReady, type ProfileHit } from './igLead.serper';
import { discoveryReader, type DiscoveryReader } from './igLead.discovery';
import { extractEmails, extractPhones } from './igLead.contacts';
import { SEARCH_LIMITS, type DiscoveredProfile, type SearchPlan } from './igLead.types';

/**
 * One run of a brief, in the background: the AI plans the Google searches,
 * Serper runs them, Business Discovery reads each new profile, the AI scores
 * them, and the ones that fit are saved as leads. The run's row is what the
 * page watches; it never stays RUNNING past a restart.
 */
const LOG = 'ig-leads';
const MAX_QUERIES = 5;
const READ_CONCURRENCY = 3;
const SCORE_BATCH = 10;
/** A run is minutes at most; one older than this died with the process that ran it. */
const STALE_MS = 15 * 60_000;

export interface StartSearchInput {
  brief: string;
  max_results?: number | null;
}

function refuse(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

const toNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);

async function planSearch(brief: string, searchId: string): Promise<SearchPlan> {
  const answer = await askForJson({
    task: 'marketing.ig_lead_plan',
    systemKey: 'ig_leads.plan',
    userKey: 'ig_leads.plan.user',
    variables: { brief },
    detail: `search ${searchId}`,
    maxTokens: 600,
  });
  const queries = stringList(answer.queries, MAX_QUERIES).map((query) => query.replaceAll(/site:\S+/gi, '').trim()).filter(Boolean);
  if (queries.length === 0) refuse('The AI could not turn that brief into a search — describe the leads in more detail.', 'AI_UNREADABLE');
  return { summary: text(answer.summary), queries, min_followers: toNumber(answer.min_followers), max_followers: toNumber(answer.max_followers) };
}

/** Every profile the searches turned up, first hit wins, snippets of the same profile joined. */
async function collectHits(queries: string[]): Promise<Map<string, string>> {
  const hits = new Map<string, string>();
  for (const query of queries) {
    const found: ProfileHit[] = await searchProfiles(query);
    for (const hit of found) hits.set(hit.username, `${hits.get(hit.username) ?? ''} ${hit.snippet}`.trim());
  }
  return hits;
}

/** Read the profiles a few at a time — Graph rate limits are per app and per hour. */
async function readProfiles(usernames: string[], reader: DiscoveryReader): Promise<DiscoveredProfile[]> {
  const read: DiscoveredProfile[] = [];
  for (let start = 0; start < usernames.length; start += READ_CONCURRENCY) {
    const batch = await Promise.all(usernames.slice(start, start + READ_CONCURRENCY).map((username) => reader.read(username)));
    read.push(...batch.filter((profile): profile is DiscoveredProfile => profile !== null));
  }
  return read;
}

const inRange = (plan: SearchPlan) => (profile: DiscoveredProfile) => {
  if (profile.followers === null) return true;
  if (plan.min_followers !== null && profile.followers < plan.min_followers) return false;
  return plan.max_followers === null || profile.followers <= plan.max_followers;
};

const profileLine = (p: DiscoveredProfile) =>
  `@${p.username} · ${p.name || '-'} · ${p.followers ?? '?'} followers · ${p.website || 'no website'} · ${p.bio.replaceAll(/\s+/g, ' ').slice(0, 300)}`;

/**
 * Scores by username. A failed batch leaves its leads unscored rather than
 * failing the run — the profiles are still worth having.
 */
async function scoreProfiles(brief: string, profiles: DiscoveredProfile[], searchId: string) {
  const scores = new Map<string, { score: number; reason: string }>();
  for (let start = 0; start < profiles.length; start += SCORE_BATCH) {
    const batch = profiles.slice(start, start + SCORE_BATCH);
    try {
      const answer = await askForJson({
        task: 'marketing.ig_lead_score',
        systemKey: 'ig_leads.score',
        userKey: 'ig_leads.score.user',
        variables: { brief, profiles: batch.map(profileLine).join('\n') },
        detail: `search ${searchId}`,
        maxTokens: 1500,
      });
      for (const raw of Array.isArray(answer.scores) ? answer.scores : []) {
        const item = (raw ?? {}) as Record<string, unknown>;
        const score = toNumber(item.score);
        const username = text(item.username).replace(/^@/, '').toLowerCase();
        if (username && score !== null) scores.set(username, { score: Math.min(100, Math.round(score)), reason: text(item.reason).slice(0, 300) });
      }
    } catch (error) {
      logs.server.warn(LOG, 'score', { error, search_id: searchId, msg: 'scoring a batch failed; its leads stay unscored' });
    }
  }
  return scores;
}

/** Insert what is new; a profile another run saved in the meantime is just not counted. */
async function saveLeads(docs: Record<string, unknown>[]): Promise<number> {
  if (docs.length === 0) return 0;
  try {
    return (await IgLeadModel.insertMany(docs, { ordered: false })).length;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const inserted = (error as { insertedDocs?: unknown[] }).insertedDocs;
    return Array.isArray(inserted) ? inserted.length : 0;
  }
}

async function runSearch(searchId: string, brief: string, maxResults: number, reader: DiscoveryReader, userId: string) {
  try {
    const plan = await planSearch(brief, searchId);
    await IgLeadSearchModel.updateOne({ _id: searchId }, { summary: plan.summary, queries: plan.queries });
    const hits = await collectHits(plan.queries);
    const known = new Set<string>(await IgLeadModel.distinct('username', { username: { $in: [...hits.keys()] } }));
    const fresh = [...hits.keys()].filter((username) => !known.has(username)).slice(0, maxResults);
    const profiles = (await readProfiles(fresh, reader)).filter(inRange(plan));
    const scores = await scoreProfiles(brief, profiles, searchId);
    const added = await saveLeads(
      profiles.map((profile) => {
        const publicText = `${profile.bio}\n${hits.get(profile.username) ?? ''}`;
        const score = scores.get(profile.username);
        return {
          ...profile,
          emails: extractEmails(publicText),
          phones: extractPhones(publicText),
          fit_score: score?.score ?? null,
          fit_reason: score?.reason ?? '',
          search_id: searchId,
          created_by: userId,
        };
      })
    );
    await IgLeadSearchModel.updateOne(
      { _id: searchId },
      { status: 'DONE', found: hits.size, added, skipped: hits.size - added, finished_at: new Date() }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.server.error(LOG, 'search', { error, search_id: searchId, msg: 'lead search failed' });
    await IgLeadSearchModel.updateOne({ _id: searchId }, { status: 'FAILED', error: message.slice(0, 500), finished_at: new Date() }).catch(
      (writeError: unknown) => logs.server.error(LOG, 'search', { error: writeError, search_id: searchId, msg: 'could not record the failure' })
    );
  }
}

/** Runs a restart cut short are failed, so the one-at-a-time rule does not lock forever. */
export async function expireStaleSearches(): Promise<void> {
  await IgLeadSearchModel.updateMany(
    { status: 'RUNNING', created_at: { $lt: new Date(Date.now() - STALE_MS) } },
    { status: 'FAILED', error: 'The server restarted while this search ran. Start it again.', finished_at: new Date() }
  );
}

/** Check, record and start a run; the row comes back RUNNING and the page polls it. */
export async function startSearch(input: StartSearchInput, userId: string) {
  const brief = (input.brief ?? '').trim();
  const { brief: briefLimits, max_results: limits } = SEARCH_LIMITS;
  if (brief.length < briefLimits.min || brief.length > briefLimits.max) {
    refuse(`Describe the leads in ${briefLimits.min}-${briefLimits.max} characters.`, 'BAD_USER_INPUT');
  }
  const maxResults = Math.min(limits.max, Math.max(limits.min, Math.round(input.max_results ?? limits.default)));
  if (!(await serperReady())) refuse('Serper is not configured. Add the SERPER API key in the Tech portal.', 'NOT_CONFIGURED');
  const reader = await discoveryReader();
  if (!reader) refuse('Connect an Instagram business account in Social Accounts first — profiles are read through it.', 'NOT_CONFIGURED');
  await expireStaleSearches();
  let search;
  try {
    search = await IgLeadSearchModel.create({ brief, max_results: maxResults, created_by: userId });
  } catch (error) {
    if (isDuplicateKeyError(error)) refuse('A search is already running — wait for it to finish.', 'CONFLICT');
    throw error;
  }
  const searchId = String(search._id);
  // runSearch records its own failure on the row; this only catches that write failing too.
  runSearch(searchId, brief, maxResults, reader, userId).catch((error: unknown) =>
    logs.server.error(LOG, 'search', { error, search_id: searchId, msg: 'lead search crashed' })
  );
  return search.toObject();
}
