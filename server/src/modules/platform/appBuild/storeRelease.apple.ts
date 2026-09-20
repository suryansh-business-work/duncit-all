import { asc, ascToken, findApp } from './appStoreConnect.gateway';
import { requireAscConfig } from './iosSigning.service';
import { appleStatus, type StoreReleaseRow } from './storeRelease.rows';

/**
 * Every App Store version of the app, live from App Store Connect, with the
 * build attached to each and the review submission that carried it.
 *
 * The version's own state is the whole story of a rejection as far as the API
 * tells it: REJECTED, METADATA_REJECTED and INVALID_BINARY are Apple's words
 * for App Review saying no. The reviewer's message is NOT on the API — it
 * lives in the Resolution Center and in the mail to the account holder — which
 * is why the issue record has a place to paste it.
 */

const ASC_APPS = 'https://appstoreconnect.apple.com/apps';

export interface AppleReleases {
  appId: string;
  appName: string;
  /** The app's distribution page on App Store Connect — where the Resolution Center is. */
  url: string;
  rows: StoreReleaseRow[];
}

interface Submission {
  state: string;
  submittedAt: string | null;
}

/** The state attribute under whichever name this API version reports it. */
const stateOf = (record: any): string =>
  String(record?.attributes?.appVersionState ?? record?.attributes?.appStoreState ?? '');

const dateOf = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/**
 * The newest review submission per version id. `include=items` brings the
 * items along with the version each one points at, so one call answers for
 * every submission the app has made.
 */
async function submissionsByVersion(token: string, appId: string): Promise<Map<string, Submission>> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[platform]': 'IOS',
    include: 'items',
    limit: '50',
  });
  const res = await asc.get(token, `/reviewSubmissions?${query}`);
  const submissions: any[] = Array.isArray(res.data) ? res.data : [];
  const items: any[] = Array.isArray(res.included) ? res.included : [];
  const itemVersion = new Map<string, string>();
  for (const item of items) {
    const versionId = item?.relationships?.appStoreVersion?.data?.id;
    if (item?.type === 'reviewSubmissionItems' && versionId) itemVersion.set(String(item.id), String(versionId));
  }
  const byVersion = new Map<string, Submission>();
  const newestFirst = [...submissions].sort((a, b) =>
    String(b.attributes?.submittedDate ?? '').localeCompare(String(a.attributes?.submittedDate ?? ''))
  );
  for (const submission of newestFirst) {
    const itemRefs: any[] = submission?.relationships?.items?.data ?? [];
    for (const ref of itemRefs) {
      const versionId = itemVersion.get(String(ref?.id ?? ''));
      if (!versionId || byVersion.has(versionId)) continue;
      byVersion.set(versionId, {
        state: String(submission.attributes?.state ?? ''),
        submittedAt: dateOf(submission.attributes?.submittedDate),
      });
    }
  }
  return byVersion;
}

function rowOf(version: any, builds: Map<string, string>, submissions: Map<string, Submission>): StoreReleaseRow {
  const id = String(version.id);
  const state = stateOf(version);
  const buildId = String(version.relationships?.build?.data?.id ?? '');
  const submission = submissions.get(id);
  return {
    id: `APP_STORE:${id}`,
    store: 'APP_STORE',
    version: String(version.attributes?.versionString ?? ''),
    build_number: builds.get(buildId) ?? '',
    state,
    status: appleStatus(state),
    track: '',
    review_state: submission?.state ?? '',
    created_at: dateOf(version.attributes?.createdDate),
    submitted_at: submission?.submittedAt ?? null,
    rollout_pct: null,
    store_ref: id,
  };
}

/** Every version, newest first. Throws with Apple's words when the key is wrong or the app is not there. */
export async function listAppleReleases(): Promise<AppleReleases> {
  const { creds, bundleId } = await requireAscConfig();
  const token = ascToken(creds);
  const app = await findApp(token, bundleId);
  if (!app) throw new Error(`App Store Connect has no app with bundle ID ${bundleId}.`);
  const query = new URLSearchParams({
    'filter[platform]': 'IOS',
    include: 'build',
    'fields[builds]': 'version',
    limit: '200',
  });
  const [res, submissions] = await Promise.all([
    asc.get(token, `/apps/${app.id}/appStoreVersions?${query}`),
    submissionsByVersion(token, app.id),
  ]);
  const versions: any[] = Array.isArray(res.data) ? res.data : [];
  const builds = new Map<string, string>(
    (Array.isArray(res.included) ? res.included : [])
      .filter((b: any) => b?.type === 'builds')
      .map((b: any) => [String(b.id), String(b.attributes?.version ?? '')])
  );
  const rows = versions.map((v) => rowOf(v, builds, submissions));
  rows.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  return { appId: app.id, appName: app.name, url: `${ASC_APPS}/${app.id}/distribution`, rows };
}
