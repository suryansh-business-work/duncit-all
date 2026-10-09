import { entityFolder, folderSegment, mediaRoot } from './mediaFolders';

/**
 * Where a new upload is filed, decided on the server from what the caller
 * asked for.
 *
 * Clients name a FEATURE folder (`/pods`, `/clubs/moments`, `/users`) — about
 * eighty of them across the apps and portals, several spelled two ways for one
 * thing. Installed app versions will keep sending those strings for months, so
 * the structure cannot depend on every caller changing. Instead each feature
 * root maps to an owner bucket, and the file goes into that owner's folder:
 *
 *   /pods/reels  + entity 66f1…  →  /production/pods/66f1…/reels
 *   /users       (signed-in 65aa) →  /production/users/65aa…/avatar
 *   /pods        (no pod yet)     →  /production/pods/incoming/65aa…/media
 *   /branding/login               →  /production/branding/login
 *
 * A pod being created has no id when its cover is uploaded, so the file waits
 * in the uploader's `incoming` folder; the media organizer later copies it
 * into the pod's own folder once the pod record names it. Platform assets
 * (branding, CMS, campaigns…) belong to no one record and keep their feature
 * path, just under the environment root.
 *
 * The entity id is a placement hint, not a permission: it decides a folder,
 * never which file is written — every upload gets a unique name — so a wrong
 * id misfiles a file and cannot overwrite one.
 */

type Owner = 'entity' | 'user';

interface Route {
  bucket: string;
  owner: Owner;
  kind: string;
}

const r = (bucket: string, owner: Owner, kind: string): Route => ({ bucket, owner, kind });

/** Feature folder (as clients send it, lower-case, no slashes at the ends) → owner folder. */
const ROUTES: Record<string, Route> = {
  pods: r('pods', 'entity', 'media'),
  'pods/media': r('pods', 'entity', 'media'),
  'pod-media': r('pods', 'entity', 'media'),
  'pods/reels': r('pods', 'entity', 'reels'),
  'pod-completion': r('pods', 'entity', 'completion'),
  'pod-status': r('pods', 'entity', 'status'),
  'pod-expenses': r('pods', 'entity', 'expenses'),
  chat: r('pods', 'entity', 'chat'),
  'auto-pods': r('auto_pods', 'entity', 'media'),
  clubs: r('clubs', 'entity', 'media'),
  'clubs/moments': r('clubs', 'entity', 'moments'),
  'club-status': r('clubs', 'entity', 'status'),
  venues: r('venues', 'entity', 'media'),
  'venues/cover': r('venues', 'entity', 'media'),
  'venues/gallery': r('venues', 'entity', 'media'),
  'venues/docs': r('venues', 'entity', 'documents'),
  'venue-documents': r('venues', 'entity', 'documents'),
  inventory: r('products', 'entity', 'media'),
  'partner-products': r('products', 'entity', 'media'),
  'product-reviews': r('product_reviews', 'entity', 'media'),
  'brands/media': r('brands', 'entity', 'media'),
  'ecomm/brands': r('brands', 'entity', 'media'),
  'ecomm/brands/docs': r('brands', 'entity', 'documents'),
  ads: r('ads', 'entity', 'media'),
  'support/tickets': r('support', 'entity', 'attachments'),
  support: r('support', 'entity', 'attachments'),
  users: r('users', 'user', 'avatar'),
  pets: r('users', 'user', 'pets'),
  posts: r('users', 'user', 'posts'),
  hosts: r('users', 'user', 'host'),
  'hosts/photo': r('users', 'user', 'host'),
  'hosts/docs': r('users', 'user', 'host_documents'),
  'host-documents': r('users', 'user', 'host_documents'),
  verifications: r('verification', 'user', 'documents'),
  feedback: r('users', 'user', 'feedback'),
  'support/chat': r('users', 'user', 'support_chat'),
  'support-chat': r('users', 'user', 'support_chat'),
  'staff-chat': r('staff', 'user', 'chat'),
  'call-recordings': r('staff', 'user', 'call_recordings'),
};

/** Where a pod's cover waits before the pod exists. */
const INCOMING = 'incoming';

/** The feature folder as a lookup key: `/Pods/Reels/` → `pods/reels`. */
const featureKey = (folder: string): string => folder.trim().split('/').filter(Boolean).join('/').toLowerCase();

/** A free-form feature path kept as-is, each segment made folder-safe. */
function featurePath(key: string): string {
  const segments = key.split('/').map(folderSegment).filter((segment): segment is string => !!segment);
  return `${mediaRoot()}/${segments.length ? segments.join('/') : 'uploads'}`;
}

export interface UploadPlacement {
  /** The signed-in uploader. */
  userId?: string | null;
  /** The record the file is for, when the caller knows it (pod, club, venue…). */
  entityId?: string | null;
}

/**
 * The structured folder for an upload. A folder already under this
 * environment's root was resolved before (a compressed video re-uploaded next
 * to its original) and is kept, so resolving twice changes nothing.
 */
export function resolveUploadFolder(folder: string | null | undefined, placement: UploadPlacement = {}): string {
  const asked = (folder ?? '').trim();
  const root = mediaRoot();
  if (asked === root || asked.startsWith(`${root}/`)) return asked;
  const key = featureKey(asked) || 'uploads';
  const route = ROUTES[key];
  if (!route) return featurePath(key);
  const entity = folderSegment(placement.entityId);
  const user = folderSegment(placement.userId);
  const owner = route.owner === 'user' ? (entity ?? user) : entity;
  if (owner) return entityFolder(route.bucket, owner, route.kind);
  // An owned feature with no owner yet: park it under the uploader.
  return `${root}/${route.bucket}/${INCOMING}/${user ?? 'anonymous'}/${route.kind}`;
}
