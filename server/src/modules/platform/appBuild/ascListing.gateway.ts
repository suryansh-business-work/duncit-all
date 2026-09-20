import { asc, AscError } from './appStoreConnect.gateway';

/**
 * The App Store listing, as far as one release needs it: the app-level record
 * (name, subtitle, privacy policy, category), the version-level record
 * (description, keywords, what's new, URLs, copyright), the review contact,
 * and the build attached to the version. Every write is an upsert against
 * whatever App Store Connect already has, so a listing first typed into the
 * website by hand is updated in place rather than duplicated.
 */

export interface AppleReviewContact {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  demoAccountName: string;
  demoAccountPassword: string;
  demoAccountRequired: boolean;
  notes: string;
}

export interface AppleListing {
  locale: string;
  name: string;
  subtitle: string;
  privacyPolicyUrl: string;
  primaryCategory: string;
  copyright: string;
  description: string;
  keywords: string;
  whatsNew: string;
  supportUrl: string;
  marketingUrl: string;
  review: AppleReviewContact;
}

/**
 * States in which a version or app-info record can still be written to.
 * Anything else is live, on its way to being live, or already replaced.
 */
const EDITABLE_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);

/** The state attribute under whichever name this API version reports it. */
const stateOf = (record: any): string =>
  String(record?.attributes?.appVersionState ?? record?.attributes?.state ?? record?.attributes?.appStoreState ?? '');

/** Attributes with the empty ones dropped: Apple keeps a field it was not sent, and refuses some blanks. */
const compact = (attributes: Record<string, string | boolean>): Record<string, string | boolean> =>
  Object.fromEntries(Object.entries(attributes).filter(([, v]) => v !== ''));

const findByLocale = (records: unknown, locale: string): any =>
  (Array.isArray(records) ? records : []).find((r: any) => r.attributes?.locale === locale);

/** The app-info record that can be edited — the draft when there is one, else the only one. */
export async function editableAppInfo(token: string, appId: string): Promise<string> {
  const res = await asc.get(token, `/apps/${appId}/appInfos?limit=10`);
  const infos: any[] = Array.isArray(res.data) ? res.data : [];
  const editable = infos.find((i) => EDITABLE_STATES.has(stateOf(i))) ?? infos[0];
  if (!editable) throw new Error('App Store Connect has no app information record for this app yet.');
  return String(editable.id);
}

/** Name, subtitle and privacy policy for the listing's locale. */
export async function upsertAppInfoLocalization(token: string, appInfoId: string, listing: AppleListing): Promise<void> {
  const res = await asc.get(token, `/appInfos/${appInfoId}/appInfoLocalizations?limit=200`);
  const attributes = compact({
    name: listing.name,
    subtitle: listing.subtitle,
    privacyPolicyUrl: listing.privacyPolicyUrl,
  });
  const existing = findByLocale(res.data, listing.locale);
  if (existing) {
    await asc.patch(token, `/appInfoLocalizations/${existing.id}`, {
      type: 'appInfoLocalizations',
      id: String(existing.id),
      attributes,
    });
    return;
  }
  await asc.post(token, '/appInfoLocalizations', {
    type: 'appInfoLocalizations',
    attributes: { ...attributes, locale: listing.locale },
    relationships: { appInfo: { data: { type: 'appInfos', id: appInfoId } } },
  });
}

export async function setPrimaryCategory(token: string, appInfoId: string, categoryId: string): Promise<void> {
  await asc.patch(token, `/appInfos/${appInfoId}`, {
    type: 'appInfos',
    id: appInfoId,
    relationships: { primaryCategory: { data: { type: 'appCategories', id: categoryId } } },
  });
}

export interface EnsuredVersion {
  id: string;
  /**
   * No other version exists: this is the app's first. Apple refuses "What's
   * New" on it (409 STATE_ERROR — there is nothing for it to be new since), so
   * the caller leaves that field out, as fastlane's deliver does.
   */
  first: boolean;
}

/**
 * The App Store version this build goes out as: the editable one, renamed to
 * this version string if it differs, or a new one. Released after approval,
 * because a push that then needs a second click on the website is not a push.
 */
export async function ensureAppStoreVersion(
  token: string,
  appId: string,
  versionString: string,
  copyright: string
): Promise<EnsuredVersion> {
  const query = new URLSearchParams({ 'filter[platform]': 'IOS', limit: '10' });
  const res = await asc.get(token, `/apps/${appId}/appStoreVersions?${query}`);
  const versions: any[] = Array.isArray(res.data) ? res.data : [];
  const editable = versions.find((v) => EDITABLE_STATES.has(stateOf(v)));
  const first = versions.filter((v) => v !== editable).length === 0;
  const attributes = { versionString, copyright, releaseType: 'AFTER_APPROVAL' };
  if (editable) {
    await asc.patch(token, `/appStoreVersions/${editable.id}`, {
      type: 'appStoreVersions',
      id: String(editable.id),
      attributes,
    });
    return { id: String(editable.id), first };
  }
  const created = await asc.post(token, '/appStoreVersions', {
    type: 'appStoreVersions',
    attributes: { platform: 'IOS', ...attributes },
    relationships: { app: { data: { type: 'apps', id: appId } } },
  });
  return { id: String(created.data.id), first };
}

/** Point the version at the processed build. */
export async function attachBuild(token: string, versionId: string, buildId: string): Promise<void> {
  await asc.patch(token, `/appStoreVersions/${versionId}/relationships/build`, { type: 'builds', id: buildId });
}

/** Description, keywords, what's new and URLs for the listing's locale. Returns the localization id. */
export async function upsertVersionLocalization(
  token: string,
  versionId: string,
  listing: AppleListing
): Promise<string> {
  const res = await asc.get(token, `/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`);
  const attributes = compact({
    description: listing.description,
    keywords: listing.keywords,
    whatsNew: listing.whatsNew,
    supportUrl: listing.supportUrl,
    marketingUrl: listing.marketingUrl,
  });
  const existing = findByLocale(res.data, listing.locale);
  if (existing) {
    await asc.patch(token, `/appStoreVersionLocalizations/${existing.id}`, {
      type: 'appStoreVersionLocalizations',
      id: String(existing.id),
      attributes,
    });
    return String(existing.id);
  }
  const created = await asc.post(token, '/appStoreVersionLocalizations', {
    type: 'appStoreVersionLocalizations',
    attributes: { ...attributes, locale: listing.locale },
    relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
  });
  return String(created.data.id);
}

/** Who App Review contacts and how they sign in. One record per version. */
export async function upsertReviewDetail(token: string, versionId: string, review: AppleReviewContact): Promise<void> {
  // Apple answers 404, not an empty body, for a version with no review detail yet.
  const current = await asc.get(token, `/appStoreVersions/${versionId}/appStoreReviewDetail`).catch((err) => {
    if (err instanceof AscError && err.status === 404) return { data: null };
    throw err;
  });
  const attributes = {
    ...compact({
      contactFirstName: review.contactFirstName,
      contactLastName: review.contactLastName,
      contactEmail: review.contactEmail,
      contactPhone: review.contactPhone,
      demoAccountName: review.demoAccountName,
      demoAccountPassword: review.demoAccountPassword,
      notes: review.notes,
    }),
    demoAccountRequired: review.demoAccountRequired,
  };
  const id = current.data?.id ? String(current.data.id) : '';
  if (id) {
    await asc.patch(token, `/appStoreReviewDetails/${id}`, { type: 'appStoreReviewDetails', id, attributes });
    return;
  }
  await asc.post(token, '/appStoreReviewDetails', {
    type: 'appStoreReviewDetails',
    attributes,
    relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
  });
}

/** Apple's top-level iOS category ids, for the listing form's picker. */
export async function listCategories(token: string): Promise<string[]> {
  const query = new URLSearchParams({ 'filter[platforms]': 'IOS', 'exists[parent]': 'false', limit: '200' });
  const res = await asc.get(token, `/appCategories?${query}`);
  const ids: string[] = (Array.isArray(res.data) ? res.data : []).map((c: any) => String(c.id));
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
}
