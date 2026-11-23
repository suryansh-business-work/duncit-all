import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { parseServiceAccount, type GoogleServiceAccount } from '@utils/googleServiceAccount';
import type { AscCredentials } from '@modules/platform/appBuild/appStoreConnect.gateway';
import type { AppInsightStore } from './appInsights.metrics';

/**
 * Where App Insights' credentials come from: the Tech portal's Environment
 * Variables, the same entries the store releases already use. Google Play's
 * service account and package name, plus the Cloud Storage bucket its bulk
 * reports land in; App Store Connect's API key and bundle ID. Nothing here is
 * ever returned to a client — the status says only WHICH fields are missing.
 */

export interface PlayInsightsConfig {
  account: GoogleServiceAccount;
  packageName: string;
  /** The bucket name alone: `pubsite_prod_rev_01234567890123456789`. */
  bucket: string;
}

export interface AppleInsightsConfig {
  creds: AscCredentials;
  bundleId: string;
}

export interface ConfigRead<T> {
  config: T | null;
  /** The env entry's field names still blank (or unreadable), for the configuration-required state. */
  missing: string[];
  /** Why a present value cannot be used (a key that is not JSON), credential-free. */
  problem: string;
}

/** Bucket names: lower-case letters, digits, dots, dashes and underscores, 3-222 long. */
const BUCKET_NAME = /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

/**
 * The bucket name out of whatever was pasted: Play Console offers it as
 * `gs://pubsite_prod_rev_…/` (sometimes with a folder after it). '' when what
 * is left is not a bucket name.
 */
export function bucketName(raw: string): string {
  const name = raw.trim().replace(/^gs:\/\//i, '').split('/')[0] ?? '';
  return BUCKET_NAME.test(name) ? name : '';
}

const blank = (entries: Record<string, string>): string[] =>
  Object.entries(entries)
    .filter(([, value]) => !value)
    .map(([field]) => field);

export async function readPlayInsightsConfig(): Promise<ConfigRead<PlayInsightsConfig>> {
  const [json, packageName, rawBucket] = await Promise.all([
    getRuntimeEnvValue('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'),
    getRuntimeEnvValue('GOOGLE_PLAY_PACKAGE_NAME'),
    getRuntimeEnvValue('GOOGLE_PLAY_REPORTS_BUCKET'),
  ]);
  const bucket = bucketName(rawBucket);
  const values = { service_account_json: json.trim(), package_name: packageName.trim(), reports_bucket: bucket };
  const missing = blank(values);
  if (rawBucket.trim() && !bucket) {
    return { config: null, missing, problem: 'The reports bucket is not a Cloud Storage bucket name or gs:// address.' };
  }
  if (missing.length > 0) return { config: null, missing, problem: '' };
  try {
    return {
      config: { account: parseServiceAccount(values.service_account_json), packageName: values.package_name, bucket },
      missing,
      problem: '',
    };
  } catch (err) {
    return { config: null, missing, problem: err instanceof Error ? err.message : String(err) };
  }
}

export async function readAppleInsightsConfig(): Promise<ConfigRead<AppleInsightsConfig>> {
  const [issuerId, keyId, privateKey, bundleId] = await Promise.all([
    getRuntimeEnvValue('APP_STORE_CONNECT_ISSUER_ID'),
    getRuntimeEnvValue('APP_STORE_CONNECT_KEY_ID'),
    getRuntimeEnvValue('APP_STORE_CONNECT_PRIVATE_KEY'),
    getRuntimeEnvValue('APP_STORE_CONNECT_BUNDLE_ID'),
  ]);
  const values = {
    issuer_id: issuerId.trim(),
    key_id: keyId.trim(),
    private_key: privateKey.trim(),
    bundle_id: bundleId.trim(),
  };
  const missing = blank(values);
  if (missing.length > 0) return { config: null, missing, problem: '' };
  return {
    config: {
      creds: { issuerId: values.issuer_id, keyId: values.key_id, privateKey: values.private_key },
      bundleId: values.bundle_id,
    },
    missing,
    problem: '',
  };
}

/** The Tech portal env category each store's credentials live in. */
export const ENV_CATEGORY_OF: Record<AppInsightStore, string> = {
  GOOGLE_PLAY: 'GOOGLE_PLAY',
  APP_STORE: 'APP_STORE_CONNECT',
};
