import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { requestIdentity } from '@observability/requestIdentity';
import { BackgroundJobModel, type BackgroundJobFields } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { actorOf, backgroundJobService, toJob } from '@modules/platform/backgroundJob/backgroundJob.service';
import { serperReady } from '@modules/crm/marketing/igLeads/igLead.serper';
import { LEAD_LABELS } from '@modules/crm/crm/leadModels';
import { cleanText } from '@modules/crm/leadQuality/leadQuality.service';
import { toHundredths, type QualityLeadType } from '@modules/crm/leadQuality/leadQuality.rules';
import { planQueries } from './leadResearch.ai';
import { LeadCandidateModel, SOURCE_KINDS, type CandidateSourceKind, type LeadCandidateDoc } from './leadResearch.model';
import type { DiscoveryParams } from './leadResearch.discoveryStep';

/**
 * Start, retry, cancel and read lead discovery jobs. A job is a background job
 * (kind LEAD_DISCOVERY) on the shared runner: it shows in the starter's jobs
 * drawer, resumes after a restart, and can be cancelled between searches.
 */

export const DISCOVERY_LIMITS = { target: { min: 1, max: 100, default: 20 }, runningPerPerson: 2, place: 80, text: 200 } as const;

/** Where each lead type is found by default: places for venues and sellers, Instagram for everyone. */
const DEFAULT_SOURCES: Readonly<Record<QualityLeadType, CandidateSourceKind[]>> = {
  VENUE_LEAD: ['GOOGLE_MAPS', 'INSTAGRAM'],
  ECOMM_LEAD: ['GOOGLE_MAPS', 'INSTAGRAM'],
  HOST_LEAD: ['INSTAGRAM'],
  COMMUNITY_LEAD: ['INSTAGRAM'],
  CREATOR_LEAD: ['INSTAGRAM'],
};
/** Discovery reads Instagram and Google Maps only; WEB is a source kind MCP-supplied candidates may carry. */
const DISCOVERABLE: readonly CandidateSourceKind[] = ['INSTAGRAM', 'GOOGLE_MAPS'];

export interface StartDiscoveryInput {
  lead_type: QualityLeadType;
  city: string;
  locality?: string | null;
  category?: string | null;
  keywords?: string | null;
  target_count?: number | null;
  min_score?: number | null;
  sources?: readonly string[] | null;
  ai_evidence?: boolean | null;
}

const refuse = (message: string, code = 'BAD_USER_INPUT'): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

function checkedInput(input: StartDiscoveryInput) {
  const city = cleanText(input.city, DISCOVERY_LIMITS.place);
  if (city.length < 2) refuse('Say which city to search.');
  const target = input.target_count ?? DISCOVERY_LIMITS.target.default;
  if (!Number.isInteger(target) || target < DISCOVERY_LIMITS.target.min || target > DISCOVERY_LIMITS.target.max) {
    refuse(`Ask for ${DISCOVERY_LIMITS.target.min}-${DISCOVERY_LIMITS.target.max} leads per discovery.`);
  }
  const minScore = input.min_score ?? null;
  if (minScore !== null && (toHundredths(minScore) === null || minScore < 0 || minScore > 100)) refuse('The minimum score must be between 0 and 100.');
  const asked = (input.sources ?? []).filter(Boolean);
  const unknown = asked.filter((source) => !DISCOVERABLE.includes(source as CandidateSourceKind) || !SOURCE_KINDS.includes(source as CandidateSourceKind));
  if (unknown.length > 0) refuse(`Discovery searches ${DISCOVERABLE.join(' and ')}; ${unknown.join(', ')} cannot be searched.`);
  return {
    city,
    locality: cleanText(input.locality, DISCOVERY_LIMITS.place),
    category: cleanText(input.category, DISCOVERY_LIMITS.place),
    keywords: cleanText(input.keywords, DISCOVERY_LIMITS.text),
    target,
    minScore,
    sources: asked.length > 0 ? [...new Set(asked as CandidateSourceKind[])] : DEFAULT_SOURCES[input.lead_type],
  };
}

async function createJob(user: AuthUser, params: DiscoveryParams) {
  const label = `${params.target_count} ${LEAD_LABELS[params.lead_type].toLowerCase()}s in ${[params.locality, params.city].filter(Boolean).join(', ')}`;
  const job = await BackgroundJobModel.create({
    kind: 'LEAD_DISCOVERY',
    label: `Discover ${label}`.slice(0, 200),
    url: '/lead-research',
    params,
    total: params.target_count,
    actor: actorOf(user),
    identity: requestIdentity.current() ?? { user: actorOf(user) },
  });
  scheduleJob(String(job._id));
  return job.toObject() as BackgroundJobFields & { _id: unknown };
}

async function assertCanStart(user: AuthUser): Promise<void> {
  if (!(await serperReady())) refuse('Lead discovery needs the Serper API key (Tech › Environment › SERPER).', 'NOT_CONFIGURED');
  const running = await BackgroundJobModel.countDocuments({ kind: 'LEAD_DISCOVERY', status: 'RUNNING', 'actor.id': user.id });
  if (running >= DISCOVERY_LIMITS.runningPerPerson) {
    refuse(`You already have ${running} discoveries running. Wait for one to finish or cancel it.`, 'CONFLICT');
  }
}

const emptyStats = () => ({ found: 0, saved: 0, qualifying: 0, duplicates: 0, already_queued: 0, refused: 0 });

/** The job with its request, counts and best candidates — what the console and MCP show. */
export async function discoveryView(doc: BackgroundJobFields & { _id: unknown }, candidateLimit = 25) {
  const params = doc.params as unknown as DiscoveryParams;
  const candidates = await LeadCandidateModel.find({ job_id: String(doc._id) })
    .sort({ status: 1, score: -1 })
    .limit(Math.min(Math.max(candidateLimit, 0), 100))
    .lean<LeadCandidateDoc[]>();
  return {
    ...toJob(doc),
    lead_type: params.lead_type,
    city: params.city,
    locality: params.locality,
    category: params.category,
    keywords: params.keywords,
    target_count: params.target_count,
    min_score: params.min_score,
    sources: params.sources,
    queries: params.queries,
    plan_note: params.plan_note,
    searches_run: typeof doc.cursor === 'number' ? doc.cursor : 0,
    stats: { ...emptyStats(), ...params.stats },
    candidates,
  };
}

async function ownJob(id: string, user: AuthUser) {
  if (!Types.ObjectId.isValid(id)) refuse('That is not a discovery job id.');
  const doc = await BackgroundJobModel.findOne({ _id: id, kind: 'LEAD_DISCOVERY' }).lean<BackgroundJobFields & { _id: unknown }>();
  if (!doc) throw new GraphQLError('Discovery job not found', { extensions: { code: 'NOT_FOUND' } });
  return { doc, mine: doc.actor.id === user.id };
}

export const leadDiscoveryService = {
  /** Plan the searches and start the job. Returns at once; the job runs in the background. */
  async start(user: AuthUser, input: StartDiscoveryInput) {
    const checked = checkedInput(input);
    await assertCanStart(user);
    const plan = await planQueries(
      { lead_type: input.lead_type, city: checked.city, locality: checked.locality, category: checked.category, keywords: checked.keywords },
      `discovery by ${user.id}`
    );
    const params: DiscoveryParams = {
      lead_type: input.lead_type,
      city: checked.city,
      locality: checked.locality,
      category: checked.category,
      keywords: checked.keywords,
      target_count: checked.target,
      min_score: checked.minScore,
      sources: checked.sources,
      queries: plan.queries,
      plan_note: plan.note,
      ai_evidence: input.ai_evidence !== false,
      stats: emptyStats(),
    };
    return discoveryView(await createJob(user, params));
  },

  /** Run a finished, failed or cancelled discovery again with the same request and searches. */
  async retry(user: AuthUser, id: string) {
    const { doc } = await ownJob(id, user);
    if (doc.status === 'RUNNING') refuse('That discovery is still running.', 'CONFLICT');
    await assertCanStart(user);
    const params = { ...(doc.params as unknown as DiscoveryParams), stats: emptyStats() };
    return discoveryView(await createJob(user, params));
  },

  /** Stop after the search in hand. Only the person who started it can. Candidates found so far stay queued. */
  async cancel(user: AuthUser, id: string) {
    const { doc, mine } = await ownJob(id, user);
    if (!mine) refuse('Only the person who started this discovery can cancel it.', 'FORBIDDEN');
    await backgroundJobService.cancel(user, String(doc._id));
    return discoveryView((await ownJob(id, user)).doc);
  },

  /** Any CRM manager may read any discovery — the queue is the team's. */
  async get(user: AuthUser, id: string, candidateLimit?: number | null) {
    return discoveryView((await ownJob(id, user)).doc, candidateLimit ?? 25);
  },

  /** The newest discoveries, newest first. */
  async list(limit?: number | null) {
    const docs = await BackgroundJobModel.find({ kind: 'LEAD_DISCOVERY' })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit ?? 20, 1), 50))
      .lean<Array<BackgroundJobFields & { _id: unknown }>>();
    return Promise.all(docs.map((doc) => discoveryView(doc, 0)));
  },
};
