import { BackgroundJobModel, type JobRowFailure, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { searchPlaces, searchProfiles, type PlaceHit, type ProfileHit } from '@modules/crm/marketing/igLeads/igLead.serper';
import { discoveryReader, type DiscoveryReader } from '@modules/crm/marketing/igLeads/igLead.discovery';
import { extractEmails, extractPhones } from '@modules/crm/marketing/igLeads/igLead.contacts';
import type { DiscoveredProfile } from '@modules/crm/marketing/igLeads/igLead.types';
import { instagramHandleOf } from '@modules/crm/leadQuality/leadQuality.lead';
import { enabledItems, type QualityLeadType } from '@modules/crm/leadQuality/leadQuality.rules';
import { leadQualityConfigService, type QualityActor } from '@modules/crm/leadQuality/leadQualityConfig.service';
import { readEvidence } from './leadResearch.ai';
import { LeadCandidateModel, type CandidateSourceKind } from './leadResearch.model';
import { leadResearchService, type SaveInput } from './leadResearch.service';

/**
 * One step of a LEAD_DISCOVERY background job: run the next (search, source)
 * pair, turn what it finds into candidates, let the AI point at evidence in
 * their public text, and save them through the same queue path MCP uses —
 * validated, de-duplicated against the CRM and every earlier batch, scored.
 *
 * Progress counts candidates that are new and meet the requested minimum
 * score; the job stops when it has enough or has run every search.
 */

export interface DiscoveryParams {
  lead_type: QualityLeadType;
  city: string;
  locality: string;
  category: string;
  keywords: string;
  target_count: number;
  min_score: number | null;
  sources: CandidateSourceKind[];
  queries: string[];
  plan_note: string;
  ai_evidence: boolean;
  stats: DiscoveryStats;
}

export interface DiscoveryStats {
  found: number;
  saved: number;
  qualifying: number;
  duplicates: number;
  already_queued: number;
  refused: number;
}

/** Profiles / listings read per step — Graph and Serper quota are spent per read. */
const PER_STEP = 8;
const FAILURES_KEPT = 20;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const profileUrl = (username: string) => `https://www.instagram.com/${username}/`;

/** "Paws & Play (@pawsandplay) • Instagram photos and videos" → "Paws & Play". */
export function nameFromTitle(snippet: string): string {
  const head = snippet.split(/\s\(@|\s•\s|\s-\sInstagram/)[0] ?? '';
  return head.trim().slice(0, 120);
}

/** Usernames / keys already in the queue are not read again — that would only spend quota. */
async function unqueued<T>(rows: T[], keyOf: (row: T) => string): Promise<T[]> {
  const keys = rows.map(keyOf).filter(Boolean);
  if (keys.length === 0) return rows;
  const queued = new Set<string>((await LeadCandidateModel.find({ keys: { $in: keys } }).select('keys').lean()).flatMap((c) => c.keys ?? []));
  return rows.filter((row) => !queued.has(keyOf(row)));
}

function instagramInput(hit: ProfileHit, profile: DiscoveredProfile | null, params: DiscoveryParams): SaveInput {
  const publicText = [profile?.bio ?? '', hit.snippet].filter(Boolean).join('\n');
  const name = profile?.name || nameFromTitle(hit.snippet) || hit.username;
  return {
    name,
    city: params.city,
    area: params.locality,
    category: params.category,
    description: profile?.bio ?? '',
    instagram: hit.username,
    website: profile?.website ?? '',
    phones: extractPhones(publicText),
    emails: extractEmails(publicText),
    sources: [{ kind: 'INSTAGRAM', url: profileUrl(hit.username), title: name, text: publicText }],
    prefetched: profile ? { instagram: profile } : undefined,
  };
}

function placeInput(place: PlaceHit, params: DiscoveryParams): SaveInput {
  const handle = /instagram\.com/i.test(place.website) ? instagramHandleOf(place.website) : '';
  const listing = [
    place.title,
    place.category,
    place.address,
    place.rating_count === null ? '' : `Rated ${place.rating ?? '?'} from ${place.rating_count} reviews`,
    place.phone ? `Phone ${place.phone}` : '',
    place.website ? `Website ${place.website}` : '',
  ].filter(Boolean);
  return {
    name: place.title,
    city: params.city,
    area: params.locality,
    address: place.address,
    category: place.category || params.category,
    phones: place.phone ? [place.phone.replaceAll(/[^\d+]/g, '')] : [],
    website: handle ? '' : place.website,
    instagram: handle,
    sources: [{ kind: 'GOOGLE_MAPS', url: place.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${place.title} ${place.address}`)}`, title: place.title, text: listing.join('. ') }],
    prefetched: { place },
  };
}

async function instagramInputs(query: string, params: DiscoveryParams, reader: DiscoveryReader | null): Promise<SaveInput[]> {
  const hits = (await unqueued(await searchProfiles(query), (hit) => `ig:${hit.username}`)).slice(0, PER_STEP);
  const inputs: SaveInput[] = [];
  for (const hit of hits) inputs.push(instagramInput(hit, reader ? await reader.read(hit.username) : null, params));
  return inputs;
}

async function placeInputs(query: string, params: DiscoveryParams): Promise<SaveInput[]> {
  const withCity = !params.city || query.toLowerCase().includes(params.city.toLowerCase()) ? query : `${query} ${params.city}`;
  const places = await searchPlaces(withCity);
  return places.slice(0, PER_STEP).map((place) => placeInput(place, params));
}

/** Let the AI point at evidence in each candidate's public text (quotes are checked word for word). */
async function withAiEvidence(inputs: SaveInput[], params: DiscoveryParams, jobId: string): Promise<{ inputs: SaveInput[]; note: string }> {
  if (!params.ai_evidence || inputs.length === 0) return { inputs, note: '' };
  const config = await leadQualityConfigService.published(params.lead_type);
  const leads = inputs.map((input) => ({ name: input.name, city: input.city ?? '', sources: input.sources ?? [] }));
  const { decisions, note } = await readEvidence(leads, enabledItems(config), `discovery ${jobId}`);
  return { inputs: inputs.map((input, index) => ({ ...input, evidence: decisions[index] ?? [] })), note };
}

interface DiscoveryTask {
  query: string;
  source: CandidateSourceKind;
}

/** One search, saved: the counters to add to the job and the notes worth showing. */
async function runTask(task: DiscoveryTask, params: DiscoveryParams, job: LeanBackgroundJob): Promise<{ inc: Record<string, number>; failures: JobRowFailure[] }> {
  const failures: JobRowFailure[] = [];
  const reader = task.source === 'INSTAGRAM' ? await discoveryReader() : null;
  const found = task.source === 'INSTAGRAM' ? await instagramInputs(task.query, params, reader) : await placeInputs(task.query, params);
  const { inputs, note } = await withAiEvidence(found, params, String(job._id));
  if (note) failures.push({ id: `${task.source}: ${task.query}`, message: note });
  if (inputs.length === 0) return { inc: { 'params.stats.found': found.length }, failures };
  const actor: QualityActor = { id: job.actor.id, name: job.actor.email };
  const report = await leadResearchService.saveCandidates(params.lead_type, inputs, actor, { origin: 'DISCOVERY', via: 'AI', job_id: String(job._id), external: true });
  const minimum = params.min_score;
  const qualifying = report.saved.filter((c) => minimum === null || (c.score ?? 0) >= minimum).length;
  for (const refused of report.refused) failures.push({ id: refused.name || `#${refused.index}`, message: refused.reasons.join('; ') });
  return {
    inc: {
      succeeded: qualifying,
      failed: report.refused.length,
      'params.stats.found': found.length,
      'params.stats.saved': report.saved.length,
      'params.stats.qualifying': qualifying,
      'params.stats.duplicates': report.duplicates.length,
      'params.stats.already_queued': report.already_queued.length,
      'params.stats.refused': report.refused.length,
    },
    failures,
  };
}

/** Run the next search. False when the job has enough candidates or no searches left. */
export async function discoverLeadsStep(job: LeanBackgroundJob): Promise<boolean> {
  const params = job.params as unknown as DiscoveryParams;
  const tasks: DiscoveryTask[] = params.queries.flatMap((query) => params.sources.map((source) => ({ query, source })));
  const index = typeof job.cursor === 'number' ? job.cursor : 0;
  const task = tasks[index];
  if (!task || job.succeeded >= job.total) return false;
  let inc: Record<string, number>;
  let failures: JobRowFailure[];
  try {
    ({ inc, failures } = await runTask(task, params, job));
  } catch (error) {
    // A source that refuses (expired Instagram token, Serper quota) fails this search, not the job.
    inc = { failed: 1 };
    failures = [{ id: `${task.source}: ${task.query}`, message: messageOf(error).slice(0, 300) }];
  }
  await BackgroundJobModel.updateOne(
    { _id: job._id },
    { $inc: inc, $set: { cursor: index + 1 }, $push: { failures: { $each: failures, $slice: FAILURES_KEPT } } }
  );
  return index + 1 < tasks.length && job.succeeded + (inc.succeeded ?? 0) < job.total;
}
