import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
process.env.DB_BACKUPS_DIR = DIR;

import {
  BACKUP_EXTENSION,
  backupPath,
  backupSize,
  deleteBackupFile,
  ensureBackupsDir,
  newBackupName,
  newUploadName,
  scanBackupsDir,
} from '../../dbBackup.store';

afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));
afterEach(() => fs.readdirSync(DIR).forEach((f) => fs.rmSync(path.join(DIR, f), { force: true })));

const AT = new Date('2026-03-04T05:06:07.089Z');

describe('names', () => {
  it('names a backup by database and instant, with a random tail that keeps two apart', () => {
    const a = newBackupName('duncit', AT);
    expect(a).toMatch(/^duncit-2026-03-04T05-06-07-089-[0-9a-f]{8}\.dbk\.gz$/);
    expect(newBackupName('duncit', AT)).not.toBe(a);
  });

  it('makes the database part a safe, bounded basename, with a default for nothing usable', () => {
    expect(newBackupName('my db/../x', AT)).toMatch(/^my_db_.._x-/);
    expect(newBackupName('a'.repeat(80), AT).split('-')[0]).toHaveLength(40);
    expect(newBackupName('', AT)).toMatch(/^database-/);
  });

  it('keeps an uploaded file recognisable but never trusts it as a path', () => {
    expect(newUploadName('nightly.dbk.gz', AT)).toMatch(/^uploaded-nightly-2026-03-04T05-06-07-089-[0-9a-f]{8}\.dbk\.gz$/);
    expect(newUploadName('../../evil name.DBK.GZ', AT)).toMatch(/^uploaded-\.\._\.\._evil_name-/);
    expect(newUploadName('', AT)).toMatch(/^uploaded-archive-/);
    expect(newUploadName('x'.repeat(100), AT).split('-')[1]).toHaveLength(40);
    expect(BACKUP_EXTENSION).toBe('.dbk.gz');
  });
});

describe('backupPath', () => {
  it('resolves a name inside the directory', () => {
    expect(backupPath('a.dbk.gz')).toBe(path.join(DIR, 'a.dbk.gz'));
  });

  it('refuses anything that escapes it, or is the directory itself', () => {
    expect(backupPath('../outside.dbk.gz')).toBeNull();
    expect(backupPath('sub/../../outside')).toBeNull();
    expect(backupPath('')).toBeNull();
    expect(backupPath('.')).toBeNull();
  });
});

describe('files', () => {
  it('creates the directory when it is missing, and is happy when it is not', async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    await ensureBackupsDir();
    await ensureBackupsDir();
    expect(fs.existsSync(DIR)).toBe(true);
  });

  it('reports the size of a stored archive, null when missing or when the name escapes', async () => {
    fs.writeFileSync(path.join(DIR, 'a.dbk.gz'), '12345');
    await expect(backupSize('a.dbk.gz')).resolves.toBe(5);
    await expect(backupSize('gone.dbk.gz')).resolves.toBeNull();
    await expect(backupSize('../x')).resolves.toBeNull();
  });

  it('deletes an archive, and treats a missing file or an escaping name as nothing to do', async () => {
    fs.writeFileSync(path.join(DIR, 'a.dbk.gz'), 'x');
    await deleteBackupFile('a.dbk.gz');
    expect(fs.existsSync(path.join(DIR, 'a.dbk.gz'))).toBe(false);
    await expect(deleteBackupFile('a.dbk.gz')).resolves.toBeUndefined();
    await expect(deleteBackupFile('../x')).resolves.toBeUndefined();
  });
});

describe('scanBackupsDir', () => {
  it('counts only archives, sums their size, finds the newest and reports room on the volume', async () => {
    fs.writeFileSync(path.join(DIR, 'old.dbk.gz'), '123');
    fs.writeFileSync(path.join(DIR, 'new.dbk.gz'), '4567');
    fs.writeFileSync(path.join(DIR, 'notes.txt'), 'ignored');
    fs.utimesSync(path.join(DIR, 'old.dbk.gz'), new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'));
    fs.utimesSync(path.join(DIR, 'new.dbk.gz'), new Date('2026-02-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'));
    const scan = await scanBackupsDir();
    expect(scan).toMatchObject({ directory: path.resolve(DIR), archives: 2, archiveBytes: 7, newestArchiveAt: '2026-02-01T00:00:00.000Z' });
    expect(scan.fsFreeBytes).toBeGreaterThan(0);
    expect(scan.fsTotalBytes).toBeGreaterThanOrEqual(scan.fsFreeBytes);
  });

  it('has no newest archive in an empty directory', async () => {
    await expect(scanBackupsDir()).resolves.toMatchObject({ archives: 0, archiveBytes: 0, newestArchiveAt: null });
  });
});

describe('default directory', () => {
  it('falls back to db-backups under the working directory when none is configured', () => {
    const saved = process.env.DB_BACKUPS_DIR;
    delete process.env.DB_BACKUPS_DIR;
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fresh = require('../../dbBackup.store') as typeof import('../../dbBackup.store');
        expect(fresh.backupPath('a.dbk.gz')).toBe(path.join(process.cwd(), 'db-backups', 'a.dbk.gz'));
      });
    } finally {
      process.env.DB_BACKUPS_DIR = saved;
    }
  });
});
