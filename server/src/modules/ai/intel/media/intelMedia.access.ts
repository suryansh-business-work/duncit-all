import type { IntelActor } from '../access/intel.access';
import type { IIntelMedia } from './intelMedia.model';

/**
 * File permissions, in one place for the GraphQL API, the download route and
 * the search filter's twin (intel.search visibilityFilter):
 *  - PRIVATE: the owner only;
 *  - TEAM: everyone with Intel access;
 *  - ADMINS: admins and super admins.
 * Changing a file (rename, move, archive, delete, visibility) is the owner's,
 * or a Super Admin's.
 */

const isOwner = (actor: IntelActor, file: Pick<IIntelMedia, 'owner_id'>) => String(file.owner_id) === actor.user.id;

export function canViewFile(actor: IntelActor, file: Pick<IIntelMedia, 'owner_id' | 'visibility'>): boolean {
  if (isOwner(actor, file) || actor.level === 'SUPER_ADMIN') return true;
  if (file.visibility === 'TEAM') return true;
  return file.visibility === 'ADMINS' && actor.level === 'ADMIN';
}

export const canManageFile = (actor: IntelActor, file: Pick<IIntelMedia, 'owner_id'>): boolean =>
  isOwner(actor, file) || actor.level === 'SUPER_ADMIN';

/** The Mongo filter for files a person may list. */
export function viewableFilter(actor: IntelActor): Record<string, unknown> {
  if (actor.level === 'SUPER_ADMIN') return {};
  const visible: Record<string, unknown>[] = [{ owner_id: actor.user.id }, { visibility: 'TEAM' }];
  if (actor.level === 'ADMIN') visible.push({ visibility: 'ADMINS' });
  return { $or: visible };
}

/** Folder paths: always absolute, no `..`, no doubled slashes. */
export function normalizeFolder(path: string | null | undefined): string {
  const parts = String(path ?? '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..')
    .map((p) => p.slice(0, 60));
  return `/${parts.slice(0, 8).join('/')}`;
}
