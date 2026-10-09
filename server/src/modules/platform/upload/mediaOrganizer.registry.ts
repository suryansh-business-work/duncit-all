/**
 * Which collections own media, and whose folder their files belong in.
 *
 * Only OWNERS are listed — the record a file was uploaded for. A file also
 * shows up in drafts, change logs, AI scan logs and notifications; those are
 * copies of the owner's value, and listing them would make every file look
 * shared between "the pod" and "the pod's change log", so nothing would ever
 * be re-homed. They keep pointing at the original path, which keeps working:
 * the organizer copies files, it never moves or deletes them.
 *
 * `owner` is the field naming whose folder it is (`_id` for the record itself);
 * a document whose owner field is empty is skipped. `skipWhen` keeps
 * short-lived rows (24h stories) out — re-homing a file Mongo is about to
 * expire is a copy for nothing.
 *
 * Buckets follow the products, not the code: the e-commerce store and the
 * Partner Brand console are separate businesses, so their brands and
 * products never share a folder.
 */

export interface MediaOwner {
  /** Mongoose model name. Models not registered in this process are skipped. */
  model: string;
  bucket: string;
  owner: string;
  kind: string;
  skipWhen?: Record<string, unknown>;
}

export const MEDIA_OWNERS: readonly MediaOwner[] = [
  { model: 'Pod', bucket: 'pods', owner: '_id', kind: 'media' },
  { model: 'PodMessage', bucket: 'pods', owner: 'pod_id', kind: 'chat' },
  { model: 'AutoPod', bucket: 'auto_pods', owner: '_id', kind: 'media' },
  { model: 'Club', bucket: 'clubs', owner: '_id', kind: 'media' },
  { model: 'Venue', bucket: 'venues', owner: '_id', kind: 'media' },
  { model: 'User', bucket: 'users', owner: '_id', kind: 'profile' },
  { model: 'Host', bucket: 'users', owner: 'user_id', kind: 'host' },
  { model: 'Post', bucket: 'users', owner: 'author_id', kind: 'posts', skipWhen: { kind: 'STORY' } },
  { model: 'UserVerification', bucket: 'verification', owner: 'user_id', kind: 'documents' },
  { model: 'InventoryProduct', bucket: 'products', owner: '_id', kind: 'media' },
  { model: 'ProductReview', bucket: 'product_reviews', owner: 'product_id', kind: 'media' },
  { model: 'EcommBrand', bucket: 'brands', owner: '_id', kind: 'media' },
  { model: 'StoreProduct', bucket: 'store_products', owner: '_id', kind: 'media' },
  { model: 'StoreBrand', bucket: 'store_brands', owner: '_id', kind: 'media' },
  { model: 'AdRequest', bucket: 'ads', owner: '_id', kind: 'media' },
  { model: 'Ticket', bucket: 'support', owner: '_id', kind: 'attachments' },
  { model: 'GrievanceTicket', bucket: 'grievances', owner: '_id', kind: 'attachments' },
];
