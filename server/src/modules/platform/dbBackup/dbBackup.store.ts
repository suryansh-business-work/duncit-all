import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Where database backup archives live: a directory on the VPS.
 *
 * Deliberately NOT served by nginx, which is the one thing that separates this
 * store from buildArtifactStore next door. An APK is a public download by
 * design; a backup archive is every user record the platform holds — addresses,
 * phone numbers, payment rows — in one file. A static nginx location would make
 * that file readable by anyone who guessed its name, so downloads instead go
 * through the server, behind a short-lived signed token; see dbBackup.token.ts.
 */

/**
 * Defaults to `<cwd>/db-backups`, which is `/app/db-backups` in the container —
 * the path the compose file bind-mounts from `/opt/duncit/db-backups`. The same
 * default gives a local dev server a writable folder with nothing configured.
 */
const BACKUPS_DIR = process.env.DB_BACKUPS_DIR || path.join(process.cwd(), 'db-backups');

/** File extension for a framed-BSON archive; see dbBackup.archive.ts. */
export const BACKUP_EXTENSION = '.dbk.gz';

/**
 * A name for one new archive: the database, the instant, and a random suffix.
 *
 * The suffix is what keeps two backups taken in the same second from landing on
 * one path — a manual run fired while the scheduled one is starting is the
 * realistic case. The result is a bare basename by construction, so joining it
 * cannot escape the directory.
 */
export function newBackupName(database: string, at: Date): string {
  const safeDb = database.replace(/[^\w.-]/g, '_').slice(0, 40) || 'database';
  const stamp = at.toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
  return `${safeDb}-${stamp}-${crypto.randomUUID().slice(0, 8)}${BACKUP_EXTENSION}`;
}

/**
 * Absolute path for a stored archive, or null if `name` escapes the directory.
 *
 * Every caller resolves through here rather than trusting newBackupName,
 * because delete and restore resolve names that came back out of the database,
 * where a bad one written by an older build would still be sitting.
 */
export function backupPath(name: string): string | null {
  const resolved = path.resolve(BACKUPS_DIR, name);
  const root = path.resolve(BACKUPS_DIR);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

/** Create the directory if it is not there yet. Safe to call repeatedly. */
export async function ensureBackupsDir(): Promise<void> {
  await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
}

/** Bytes on disk, or null when the file is gone. */
export async function backupSize(name: string): Promise<number | null> {
  const target = backupPath(name);
  if (!target) return null;
  const stat = await fs.promises.stat(target).catch(() => null);
  return stat ? stat.size : null;
}

/**
 * Remove a stored archive. Missing is success: the row is the record, and a
 * file already gone must not block deleting the row that points at it.
 */
export async function deleteBackupFile(name: string): Promise<void> {
  const target = backupPath(name);
  if (!target) return;
  await fs.promises.unlink(target).catch(() => undefined);
}
