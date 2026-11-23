import { serviceAccountToken, type GoogleServiceAccount } from '@utils/googleServiceAccount';
import { bucketName } from './appInsights.config';
import { newCounter, storeJson } from './appInsights.http';

/**
 * The Google Play connection test's App Insights half: can this service
 * account read the bulk-reports bucket? One listing call of a single object
 * proves both that the bucket name is right and that the account was granted
 * report access in Play Console. Never throws — the test reports the answer.
 */

const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';

export interface BucketProbe {
  ok: boolean;
  detail: string;
}

export async function probePlayReportsBucket(account: GoogleServiceAccount, raw: string): Promise<BucketProbe | null> {
  if (!raw.trim()) return null;
  const bucket = bucketName(raw);
  if (!bucket) return { ok: false, detail: 'The reports bucket is not a Cloud Storage bucket name or gs:// address.' };
  try {
    const token = await serviceAccountToken(account, SCOPE);
    const query = new URLSearchParams({ maxResults: '1', prefix: 'stats/', fields: 'items(name)' });
    await storeJson({
      service: 'Google Play reports',
      url: `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${query}`,
      init: { headers: { Authorization: `Bearer ${token}` } },
      counter: newCounter(),
    });
    return { ok: true, detail: `App Insights can read the reports bucket ${bucket}.` };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      detail: `App Insights cannot read the reports bucket ${bucket}: ${reason}. Grant ${account.client_email} "View app information and download bulk reports" in Play Console.`,
    };
  }
}
