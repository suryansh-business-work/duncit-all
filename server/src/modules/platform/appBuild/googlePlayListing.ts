import { API, UPLOAD_API, auth, call } from './googlePlay.gateway';
import { fetchStoreAssets } from './storeAssets';
import type { IStoreListing } from './storeListing.model';

/**
 * The Play store listing, applied inside the same edit that releases the AAB —
 * so a production push carries the copy and images from Store Listing with it,
 * and nothing is live until the edit commits. Title, descriptions and contact
 * details are plain PUTs; images are replaced per type (delete all, upload
 * each), which is the only way the API offers to also fix their order.
 */

export type PlayImageType = 'phoneScreenshots' | 'sevenInchScreenshots' | 'tenInchScreenshots' | 'featureGraphic' | 'icon';

export interface PlayListing {
  language: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  releaseNotes: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  images: Partial<Record<PlayImageType, string[]>>;
}

const json = (token: string) => ({ ...auth(token), 'Content-Type': 'application/json' });

/** Google refuses some blank fields outright; leaving one out keeps what the console has. */
const compact = (fields: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== ''));

/** The Store Listing in the shape Play's edit takes. */
export function playListingOf(doc: IStoreListing): PlayListing {
  return {
    language: doc.locale || 'en-US',
    title: doc.name,
    shortDescription: doc.short_description,
    fullDescription: doc.description,
    releaseNotes: doc.whats_new,
    contactEmail: doc.contact_email,
    contactPhone: doc.contact_phone,
    contactWebsite: doc.support_url,
    images: {
      phoneScreenshots: doc.android_phone_screenshots,
      sevenInchScreenshots: doc.android_tablet_7_screenshots,
      tenInchScreenshots: doc.android_tablet_10_screenshots,
      featureGraphic: doc.android_feature_graphic ? [doc.android_feature_graphic] : [],
      icon: doc.android_icon ? [doc.android_icon] : [],
    },
  };
}

/** Write the whole listing into an open edit. Nothing shows until the edit commits. */
export async function applyPlayListing(
  token: string,
  packageName: string,
  editId: string,
  listing: PlayListing
): Promise<void> {
  const base = `${API}/${packageName}/edits/${editId}`;
  await call(`${base}/details`, {
    method: 'PUT',
    headers: json(token),
    body: JSON.stringify(
      compact({
        defaultLanguage: listing.language,
        contactEmail: listing.contactEmail,
        contactPhone: listing.contactPhone,
        contactWebsite: listing.contactWebsite,
      })
    ),
  });
  await call(`${base}/listings/${listing.language}`, {
    method: 'PUT',
    headers: json(token),
    body: JSON.stringify({
      language: listing.language,
      title: listing.title,
      shortDescription: listing.shortDescription,
      fullDescription: listing.fullDescription,
    }),
  });
  for (const [type, urls] of Object.entries(listing.images)) {
    if (!urls?.length) continue;
    const assets = await fetchStoreAssets(urls);
    await call(`${base}/listings/${listing.language}/${type}`, { method: 'DELETE', headers: auth(token) });
    for (const asset of assets) {
      await call(
        `${UPLOAD_API}/${packageName}/edits/${editId}/listings/${listing.language}/${type}?uploadType=media`,
        { method: 'POST', headers: { ...auth(token), 'Content-Type': asset.contentType }, body: asset.bytes }
      );
    }
  }
}
