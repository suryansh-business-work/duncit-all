import { useResolvedPath } from 'react-router';

/**
 * A record page's own URLs, resolved from wherever its console mounted it.
 *
 * The hosts console serves a host at `/hosts/:hostId`; the clubs console serves
 * the SAME page at `/clubs/:clubId/hosts/:hostId`, so a club's host is opened,
 * edited and saved without ever leaving the club. A page that wrote `/hosts/…`
 * itself would send the clubs console to a route it does not have, so the
 * record's own links are resolved against the path it is actually on.
 */

/** From a record page (`…/:id`): its editor (`…/:id/edit`). */
export const useRecordEditPath = (): string =>
  useResolvedPath('edit', { relative: 'path' }).pathname;

/** From an editor: the record it edits (`…/:id/edit` → `…/:id`), or the list a
 * new record is added to (`…/new` → `…`). */
export const useRecordParentPath = (): string =>
  useResolvedPath('..', { relative: 'path' }).pathname;

/** Where an editor lands after Save: the record it just edited, or — when it
 * created one — the new id beside `/new`. */
export const savedRecordPath = (parentPath: string, isEdit: boolean, id: string): string =>
  isEdit ? parentPath : `${parentPath}/${id}`;
