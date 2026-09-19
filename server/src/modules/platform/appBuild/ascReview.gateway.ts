import { asc } from './appStoreConnect.gateway';

/**
 * Sending a version to App Review. A review submission is a basket: open one
 * (or reuse the one still open), put the version in it, submit. Apple's
 * answer to a version that cannot be submitted — missing screenshots, an age
 * rating never set, a contract not signed — comes back on the last step, in
 * words the row can show.
 */

/** The open submission for this app, or a new one. */
export async function openReviewSubmission(token: string, appId: string): Promise<string> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[platform]': 'IOS',
    'filter[state]': 'READY_FOR_REVIEW,UNRESOLVED_ISSUES',
    limit: '1',
  });
  const res = await asc.get(token, `/reviewSubmissions?${query}`);
  const open = Array.isArray(res.data) ? res.data[0] : null;
  if (open) return String(open.id);
  const created = await asc.post(token, '/reviewSubmissions', {
    type: 'reviewSubmissions',
    attributes: { platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: appId } } },
  });
  return String(created.data.id);
}

/** Put the version in the basket, unless a previous attempt already did. */
export async function addVersionToSubmission(token: string, submissionId: string, versionId: string): Promise<void> {
  const query = new URLSearchParams({ include: 'appStoreVersion', limit: '50' });
  const items = await asc.get(token, `/reviewSubmissions/${submissionId}/items?${query}`);
  const present = (Array.isArray(items.data) ? items.data : []).some(
    (item: any) => String(item.relationships?.appStoreVersion?.data?.id ?? '') === versionId
  );
  if (present) return;
  await asc.post(token, '/reviewSubmissionItems', {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
    },
  });
}

/** Hand the basket to App Review. */
export async function submitForReview(token: string, submissionId: string): Promise<void> {
  await asc.patch(token, `/reviewSubmissions/${submissionId}`, {
    type: 'reviewSubmissions',
    id: submissionId,
    attributes: { submitted: true },
  });
}
