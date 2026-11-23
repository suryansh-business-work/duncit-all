import { serviceAccountToken } from '@utils/googleServiceAccount';
import type { PlayInsightsConfig } from './appInsights.config';
import { storeBytes, storeJson, StoreHttpError, type SyncCounter } from './appInsights.http';
import { markSource, readSources, replaceMetrics } from './appInsights.store';
import {
  classifyPlayObject,
  monthDays,
  parsePlayReviews,
  parsePlayStats,
  PLAY_REVIEWS_KIND,
  type PlayReportFile,
} from './googlePlay.reports';

/**
 * One Google Play sync: list the report files in the bucket, read each one
 * Google has written since the last sync (a newer object generation), and
 * replace its month in the history. A file already read at its current
 * generation is skipped — the daily sync reads the current month's handful of
 * files, not the whole history again.
 */

const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const STORAGE = 'https://storage.googleapis.com/storage/v1/b';
const SERVICE = 'Google Play reports';
const STORE = 'GOOGLE_PLAY' as const;

/** How far back the first sync reads: two years and a month, so a year-on-year comparison has both years. */
export const BACKFILL_MONTHS = 25;

export interface StoreSyncResult {
  read: number;
  skipped: number;
  rows: number;
  message: string;
}

interface ObjectList {
  items?: Array<{ name?: string; generation?: string }>;
  nextPageToken?: string;
}

/** Every object under `prefix`, page by page. */
async function listObjects(token: string, bucket: string, prefix: string, counter: SyncCounter) {
  const out: Array<{ name: string; generation: string }> = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ prefix, fields: 'items(name,generation),nextPageToken' });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await storeJson<ObjectList>({
      service: SERVICE,
      url: `${STORAGE}/${encodeURIComponent(bucket)}/o?${query}`,
      init: { headers: { Authorization: `Bearer ${token}` } },
      counter,
    });
    for (const item of page.items ?? []) {
      if (item.name) out.push({ name: item.name, generation: String(item.generation ?? '') });
    }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return out;
}

/** yyyyMM of the month `months` before `now`. */
export function monthsBefore(now: Date, months: number): string {
  const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  return `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The files worth reading: ones App Insights understands, inside the backfill window, oldest month first. */
export function pickPlayFiles(
  objects: ReadonlyArray<{ name: string; generation: string }>,
  packageName: string,
  oldestMonth: string
): PlayReportFile[] {
  const files: PlayReportFile[] = [];
  for (const object of objects) {
    const known = classifyPlayObject(object.name, packageName);
    if (known && known.month >= oldestMonth) files.push({ ...object, ...known });
  }
  return files.sort((a, b) => a.month.localeCompare(b.month) || a.name.localeCompare(b.name));
}

async function readFile(file: PlayReportFile, cfg: PlayInsightsConfig, token: string, counter: SyncCounter) {
  const bytes = await storeBytes({
    service: SERVICE,
    url: `${STORAGE}/${encodeURIComponent(cfg.bucket)}/o/${encodeURIComponent(file.name)}?alt=media`,
    init: { headers: { Authorization: `Bearer ${token}` } },
    counter,
  });
  const { from, to } = monthDays(file.month);
  const kind = file.kind;
  const rows = 'keyOf' in kind ? parsePlayStats(bytes, kind) : parsePlayReviews(bytes);
  return replaceMetrics({ store: STORE, dimension: kind.dimension, owns: kind.owns, fromDay: from, toDay: to }, rows);
}

const PREFIXES = (pkg: string) => [
  `stats/installs/installs_${pkg}_`,
  `stats/crashes/crashes_${pkg}_`,
  `stats/ratings/ratings_${pkg}_`,
  `${PLAY_REVIEWS_KIND.prefix}${pkg}_`,
];

/** Google's 403/404 on the bucket almost always means one of two settings; say which. */
function explain(err: unknown, cfg: PlayInsightsConfig): never {
  if (err instanceof StoreHttpError && (err.status === 403 || err.status === 404)) {
    throw new Error(
      `${err.message}. Check that the bucket is "${cfg.bucket}" (Play Console → Download reports → Copy Cloud Storage URI) ` +
        `and that ${cfg.account.client_email} has "View app information and download bulk reports" in Play Console.`,
      { cause: err }
    );
  }
  throw err;
}

export async function syncGooglePlay(cfg: PlayInsightsConfig, counter: SyncCounter, now = new Date()): Promise<StoreSyncResult> {
  try {
    const token = await serviceAccountToken(cfg.account, SCOPE);
    counter.calls += 1;
    const listed = (
      await Promise.all(PREFIXES(cfg.packageName).map((prefix) => listObjects(token, cfg.bucket, prefix, counter)))
    ).flat();
    const files = pickPlayFiles(listed, cfg.packageName, monthsBefore(now, BACKFILL_MONTHS));
    const seen = await readSources(STORE);
    let read = 0;
    let rows = 0;
    for (const file of files) {
      if (seen.get(file.name) === file.generation) continue;
      rows += await readFile(file, cfg, token, counter);
      await markSource(STORE, file.name, file.generation);
      read += 1;
    }
    const skipped = files.length - read;
    const message =
      files.length === 0
        ? 'No report files in the bucket yet. Google writes them within a day or two of access being granted.'
        : `Read ${read} report file(s), ${skipped} unchanged.`;
    return { read, skipped, rows, message };
  } catch (err) {
    return explain(err, cfg);
  }
}
