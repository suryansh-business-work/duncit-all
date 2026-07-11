/**
 * Seeds a small set of historical (already-resolved) incidents so the status
 * page's 90-day chart and Incidents feed have minimum data to render.
 *
 * Gated + idempotent: only runs when the collection is empty AND either the
 * deployment is staging or STATUS_SEED_INCIDENTS=1 is set, so a production
 * status page never shows fabricated incidents unless explicitly opted in.
 */
import { IncidentModel, type IncidentImpact } from './incident.model';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

interface SeedSpec {
  service_key: string;
  title: string;
  body: string;
  impact: IncidentImpact;
  /** Days before now the incident started. */
  startedDaysAgo: number;
  /** Duration in hours (resolved). */
  durationHours: number;
}

const SEEDS: readonly SeedSpec[] = [
  {
    service_key: 'server',
    title: 'Elevated API latency',
    body: 'A slow database query caused elevated GraphQL response times. Resolved after the query was indexed.',
    impact: 'degraded',
    startedDaysAgo: 82,
    durationHours: 2,
  },
  {
    service_key: 'crm',
    title: 'CRM console intermittently unreachable',
    body: 'A bad deploy left the CRM container restarting. Rolled back to the previous image.',
    impact: 'partial_outage',
    startedDaysAgo: 61,
    durationHours: 1,
  },
  {
    service_key: 'mweb',
    title: 'Member web app returning 5xx',
    body: 'An expired TLS upstream caused 502s for a subset of users. Certificate renewed and nginx reloaded.',
    impact: 'major_outage',
    startedDaysAgo: 40,
    durationHours: 1,
  },
  {
    service_key: 'ai',
    title: 'AI tooling degraded',
    body: 'Upstream model provider rate-limited requests, slowing AI features. Recovered automatically.',
    impact: 'degraded',
    startedDaysAgo: 21,
    durationHours: 3,
  },
  {
    service_key: 'partners-app',
    title: 'Partner uploads failing',
    body: 'Image uploads timed out due to a storage hiccup. Restored once upstream storage recovered.',
    impact: 'partial_outage',
    startedDaysAgo: 6,
    durationHours: 1,
  },
];

/** True when seeding sample incidents is allowed for this deployment. */
export function shouldSeedIncidents(): boolean {
  return process.env.APP_ENV === 'staging' || process.env.STATUS_SEED_INCIDENTS === '1';
}

export async function seedStatusIncidents(): Promise<void> {
  if (!shouldSeedIncidents()) return;
  const existing = await IncidentModel.estimatedDocumentCount();
  if (existing > 0) return;

  const now = Date.now();
  const docs = SEEDS.map((spec) => {
    const started = new Date(now - spec.startedDaysAgo * DAY_MS);
    const resolved = new Date(started.getTime() + spec.durationHours * HOUR_MS);
    return {
      service_key: spec.service_key,
      title: spec.title,
      body: spec.body,
      impact: spec.impact,
      status: 'resolved' as const,
      started_at: started,
      resolved_at: resolved,
    };
  });
  await IncidentModel.insertMany(docs);
}
