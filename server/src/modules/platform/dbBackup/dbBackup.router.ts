import fs from 'node:fs';
import { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { dbBackupService } from './dbBackup.service';
import { backupPath } from './dbBackup.store';
import { DOWNLOAD_TTL_MS, verifyDownloadToken } from './dbBackup.token';

/**
 * The one way a backup archive leaves the server.
 *
 *   GET /db-backups/download?token=…
 *
 * Build artifacts sit in an nginx location because an APK is a public download
 * by design. An archive is the opposite: every user record the platform holds,
 * in one file. So there is no static location for these, and this route is not
 * guessable — the token names a single backup, is signed with the server
 * secret, and expires in minutes. The portal asks GraphQL for one, where the
 * caller is already authorised as SUPER_ADMIN.
 *
 * A token in a query string is written down by everything it passes — nginx's
 * access log, browser history, a pasted screenshot. That is survivable only
 * because the window is minutes wide; it is the reason it is minutes and not
 * hours, and the reason a link is minted per download rather than stored.
 */

/** Derived from the signer's own TTL, so the two cannot drift apart. */
export const DOWNLOAD_TTL_SECONDS = DOWNLOAD_TTL_MS / 1000;

const MOUNT_PATH = '/db-backups';
const DOWNLOAD_PATH = '/download';

/** The absolute path a download link points at, mount prefix included. */
export const downloadRoutePath = () => `${MOUNT_PATH}${DOWNLOAD_PATH}`;

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/** The token, from the query string or the `x-backup-token` header. */
function downloadToken(req: Request): string {
  const header = req.headers['x-backup-token'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof fromHeader === 'string' && fromHeader.trim() !== '') return fromHeader.trim();
  const raw = req.query.token;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Resolve a request to a readable archive, or answer it and return null.
 *
 * Every rejection says the same thing. A caller holding a bad token learns
 * nothing about whether the backup exists, and a caller holding a good one
 * already knows.
 */
async function resolveArchive(
  req: Request,
  res: Response,
): Promise<{ path: string; name: string } | null> {
  const reject = () => {
    res.set(NO_STORE).status(404).type('text/plain').send('Not found\n');
    return null;
  };
  const backupId = verifyDownloadToken(downloadToken(req));
  if (!backupId) return reject();
  const backup = await dbBackupService.fileFor(backupId);
  if (!backup?.file_name) return reject();
  const path = backupPath(backup.file_name);
  if (!path || !fs.existsSync(path)) return reject();
  return { path, name: backup.file_name };
}

export function buildDbBackupRouter(): Router {
  const router = Router();

  router.get(DOWNLOAD_PATH, (req, res) => {
    resolveArchive(req, res)
      .then((archive) => {
        if (!archive) return;
        res
          .set(NO_STORE)
          .type('application/gzip')
          .attachment(archive.name)
          .sendFile(archive.path, (err) => {
            // Headers are already out by the time sendFile can fail, so this is
            // a log line rather than a response — most often a client that hung
            // up part-way through a multi-gigabyte download.
            if (err) logs.server.warn('dbBackup', 'download', { error: err, file: archive.name });
          });
      })
      .catch((err) => {
        logs.server.error('dbBackup', 'download', { error: err });
        if (!res.headersSent) res.set(NO_STORE).status(500).type('text/plain').send('Error\n');
      });
  });

  return router;
}
