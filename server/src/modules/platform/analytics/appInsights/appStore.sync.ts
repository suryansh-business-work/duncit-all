import { ascToken } from '@modules/platform/appBuild/appStoreConnect.gateway';
import type { AppleInsightsConfig } from './appInsights.config';
import { storeBytes, storeJson, StoreHttpError, type SyncCounter } from './appInsights.http';
import { AppInsightStateModel } from './appInsights.model';
import { markSource, readSources, replaceMetrics } from './appInsights.store';
import type { MetricRow } from './appInsights.metrics';
import { appleKindOf, dayBounds, readAppleSegment, type AppleReportKind } from './appStore.reports';
import { syncAppleReviews } from './appStore.reviews';
import type { StoreSyncResult } from './googlePlay.sync';

/**
 * One App Store sync. The analytics side needs an ONGOING report request for
 * the app — made once, kept on the state document, remade if Apple stopped it
 * for inactivity. Apple then produces daily instances of each report; every
 * instance not read before is downloaded (all its segments), added up and
 * written over its days. Reviews are read separately (appStore.reviews.ts).
 */

export const ASC_API = 'https://api.appstoreconnect.apple.com/v1';
export const SERVICE = 'App Store Connect';
const STORE = 'APP_STORE' as const;
/** Instances processed longer ago than this are not read on a first sync. */
const BACKFILL_DAYS = 400;
const DAY_MS = 86_400_000;
/** Apple accepts a token for 20 minutes; it is re-signed well before. */
const TOKEN_REFRESH_MS = 8 * 60_000;

interface AscResource {
  id?: string;
  attributes?: Record<string, unknown>;
}

interface AscPage {
  data?: AscResource[] | AscResource;
  links?: { next?: string };
}

/** Signs a fresh token when the last one is getting old — a long first sync outlives one. */
export function tokenSource(cfg: AppleInsightsConfig, now: () => number = Date.now): () => string {
  let token = '';
  let signedAt = 0;
  return () => {
    if (!token || now() - signedAt > TOKEN_REFRESH_MS) {
      token = ascToken(cfg.creds);
      signedAt = now();
    }
    return token;
  };
}

export interface AscClient {
  get: (pathOrUrl: string) => Promise<AscPage>;
  all: (path: string) => Promise<AscResource[]>;
  post: (path: string, body: unknown) => Promise<AscPage>;
  counter: SyncCounter;
}

/** A path under the API, or one of Apple's own `links.next` — never any other host. */
function apiUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith(`${ASC_API}/`)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${ASC_API}${pathOrUrl}`;
  throw new Error(`${SERVICE} returned a link outside its API.`);
}

export function ascClient(token: () => string, counter: SyncCounter): AscClient {
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
  const get = (pathOrUrl: string) =>
    storeJson<AscPage>({ service: SERVICE, url: apiUrl(pathOrUrl), init: { headers: headers() }, counter });
  return {
    counter,
    get,
    post: (path, body) =>
      storeJson<AscPage>({
        service: SERVICE,
        url: apiUrl(path),
        init: { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        counter,
        write: true,
      }),
    all: async (path) => {
      const out: AscResource[] = [];
      let next: string | undefined = path;
      while (next) {
        const page: AscPage = await get(next);
        if (Array.isArray(page.data)) out.push(...page.data);
        next = page.links?.next;
      }
      return out;
    },
  };
}

const listOf = (page: AscPage): AscResource[] => (Array.isArray(page.data) ? page.data : []);

/** The app's id on App Store Connect, from the state or looked up by bundle ID. */
async function appIdOf(api: AscClient, bundleId: string, known: string): Promise<string> {
  if (known) return known;
  const query = new URLSearchParams({ 'filter[bundleId]': bundleId, limit: '1' });
  const app = listOf(await api.get(`/apps?${query}`))[0];
  if (!app?.id) throw new Error(`${SERVICE} has no app with bundle ID ${bundleId}.`);
  return String(app.id);
}

/** The ONGOING report request to read: an existing live one, or a new one. */
async function reportRequestOf(api: AscClient, appId: string, known: string): Promise<{ id: string; created: boolean }> {
  const requests = await api.all(`/apps/${appId}/analyticsReportRequests?filter[accessType]=ONGOING&limit=50`);
  const live = requests.find((r) => r.attributes?.stoppedDueToInactivity !== true && (!known || r.id === known)) ??
    requests.find((r) => r.attributes?.stoppedDueToInactivity !== true);
  if (live?.id) return { id: String(live.id), created: false };
  try {
    const made = await api.post('/analyticsReportRequests', {
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    const id = Array.isArray(made.data) ? undefined : made.data?.id;
    if (!id) throw new Error(`${SERVICE} did not return the new report request.`);
    return { id: String(id), created: true };
  } catch (err) {
    if (err instanceof StoreHttpError && err.status === 403) {
      throw new Error(`${err.message}. Analytics reports need an App Store Connect API key with the Admin role.`, { cause: err });
    }
    throw err;
  }
}

/** Reads one instance — every segment — and writes it over its days. Returns store-days written. */
async function readInstance(api: AscClient, instanceId: string, kind: AppleReportKind): Promise<number> {
  const segments = await api.all(`/analyticsReportInstances/${instanceId}/segments?limit=200`);
  const rows = new Map<string, MetricRow>();
  for (const segment of segments) {
    const url = String(segment.attributes?.url ?? '');
    if (!url.startsWith('https://')) continue;
    const bytes = await storeBytes({ service: SERVICE, url, counter: api.counter });
    readAppleSegment(bytes, kind, rows);
  }
  const bounds = dayBounds(rows.values());
  if (!bounds) return 0;
  let written = 0;
  for (const dimension of kind.dimensions) {
    written += await replaceMetrics(
      { store: STORE, dimension, owns: kind.owns, fromDay: bounds.from, toDay: bounds.to },
      [...rows.values()]
    );
  }
  return written;
}

/** Every daily instance of the wanted reports, inside the backfill window. */
async function instancesOf(api: AscClient, requestId: string, now: Date) {
  const reports = await api.all(`/analyticsReportRequests/${requestId}/reports?limit=200`);
  const oldest = new Date(now.getTime() - BACKFILL_DAYS * DAY_MS).toISOString().slice(0, 10);
  const out: Array<{ id: string; kind: AppleReportKind }> = [];
  for (const report of reports) {
    const kind = appleKindOf(String(report.attributes?.name ?? ''));
    if (!kind || !report.id) continue;
    const instances = await api.all(`/analyticsReports/${report.id}/instances?filter[granularity]=DAILY&limit=200`);
    for (const instance of instances) {
      const processed = String(instance.attributes?.processingDate ?? '');
      if (instance.id && processed >= oldest) out.push({ id: String(instance.id), kind });
    }
  }
  return out;
}

export async function syncAppStore(cfg: AppleInsightsConfig, counter: SyncCounter, now = new Date()): Promise<StoreSyncResult> {
  const api = ascClient(tokenSource(cfg), counter);
  const state = await AppInsightStateModel.findOne({ store: STORE }).lean();
  const appId = await appIdOf(api, cfg.bundleId, state?.app_id ?? '');
  const request = await reportRequestOf(api, appId, state?.report_request_id ?? '');
  await AppInsightStateModel.updateOne({ store: STORE }, { $set: { app_id: appId, report_request_id: request.id } });

  const instances = await instancesOf(api, request.id, now);
  const seen = await readSources(STORE);
  let read = 0;
  let rows = 0;
  for (const instance of instances) {
    if (seen.has(instance.id)) continue;
    rows += await readInstance(api, instance.id, instance.kind);
    await markSource(STORE, instance.id, '');
    read += 1;
  }
  const reviews = await syncAppleReviews(api, appId, state?.reviews_through ?? '', now);
  rows += reviews.rows;

  const skipped = instances.length - read;
  const waiting = request.created || instances.length === 0;
  const message = waiting
    ? `Apple is preparing the first analytics reports; they usually appear within one to two days. Read ${reviews.reviews} review(s).`
    : `Read ${read} report instance(s), ${skipped} unchanged, and ${reviews.reviews} review(s).`;
  return { read: read + reviews.pages, skipped, rows, message };
}
