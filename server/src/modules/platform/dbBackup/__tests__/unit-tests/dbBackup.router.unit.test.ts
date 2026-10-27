import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { buildDbBackupRouter, DOWNLOAD_TTL_SECONDS, downloadRoutePath } from '../../dbBackup.router';
import { dbBackupService } from '../../dbBackup.service';
import { backupPath } from '../../dbBackup.store';
import { DOWNLOAD_TTL_MS, signDownloadToken } from '../../dbBackup.token';
import { logs } from '@observability/log';

jest.mock('../../dbBackup.service', () => ({ dbBackupService: { fileFor: jest.fn() } }));
jest.mock('../../dbBackup.store', () => ({ backupPath: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));

const app = () => {
  const server = express();
  server.use('/db-backups', buildDbBackupRouter());
  return server;
};

let dir: string;
let archive: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-'));
  archive = path.join(dir, 'duncit.dbk.gz');
  fs.writeFileSync(archive, 'ARCHIVE-BYTES');
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const good = () => {
  (dbBackupService.fileFor as jest.Mock).mockResolvedValue({ file_name: 'duncit.dbk.gz' });
  (backupPath as jest.Mock).mockReturnValue(archive);
};

describe('constants', () => {
  it('derives the link lifetime from the signer and names the route', () => {
    expect(DOWNLOAD_TTL_SECONDS).toBe(DOWNLOAD_TTL_MS / 1000);
    expect(downloadRoutePath()).toBe('/db-backups/download');
  });
});

describe('GET /db-backups/download', () => {
  it('sends the archive as a no-store gzip attachment for a valid token in the query', async () => {
    good();
    const res = await request(app()).get(`/db-backups/download?token=${encodeURIComponent(signDownloadToken('b1'))}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/gzip');
    expect(res.headers['content-disposition']).toContain('attachment; filename="duncit.dbk.gz"');
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.body.toString()).toBe('ARCHIVE-BYTES');
    expect(dbBackupService.fileFor).toHaveBeenCalledWith('b1');
  });

  it('accepts the token in the x-backup-token header instead', async () => {
    good();
    const res = await request(app()).get('/db-backups/download').set('x-backup-token', ` ${signDownloadToken('b2')} `);
    expect(res.status).toBe(200);
    expect(dbBackupService.fileFor).toHaveBeenCalledWith('b2');
  });

  it('prefers the header over the query, and falls back to the query when the header is blank', async () => {
    good();
    await request(app()).get(`/db-backups/download?token=${encodeURIComponent(signDownloadToken('from-query'))}`).set('x-backup-token', signDownloadToken('from-header'));
    expect(dbBackupService.fileFor).toHaveBeenLastCalledWith('from-header');
    await request(app()).get(`/db-backups/download?token=${encodeURIComponent(signDownloadToken('from-query'))}`).set('x-backup-token', '   ');
    expect(dbBackupService.fileFor).toHaveBeenLastCalledWith('from-query');
  });

  it('takes the first of a repeated query token', async () => {
    good();
    const first = encodeURIComponent(signDownloadToken('first'));
    const second = encodeURIComponent(signDownloadToken('second'));
    await request(app()).get(`/db-backups/download?token=${first}&token=${second}`);
    expect(dbBackupService.fileFor).toHaveBeenLastCalledWith('first');
  });

  it.each([
    ['no token at all', ''],
    ['a forged token', '?token=forged'],
    ['an expired token', `?token=${encodeURIComponent(signDownloadToken('b1', Date.now() - 10 * 60_000))}`],
  ])('answers the same bare 404 for %s', async (_label, query) => {
    good();
    const res = await request(app()).get(`/db-backups/download${query}`);
    expect(res.status).toBe(404);
    expect(res.text).toBe('Not found\n');
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(dbBackupService.fileFor).not.toHaveBeenCalled();
  });

  it('answers the same 404 for a backup that is gone, has no file, escapes the directory or has lost its file on disk', async () => {
    const token = encodeURIComponent(signDownloadToken('b1'));
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue(null);
    expect((await request(app()).get(`/db-backups/download?token=${token}`)).text).toBe('Not found\n');
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue({ file_name: null });
    expect((await request(app()).get(`/db-backups/download?token=${token}`)).status).toBe(404);
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue({ file_name: '../../etc/passwd' });
    (backupPath as jest.Mock).mockReturnValue(null);
    expect((await request(app()).get(`/db-backups/download?token=${token}`)).status).toBe(404);
    (backupPath as jest.Mock).mockReturnValue(path.join(dir, 'missing.dbk.gz'));
    expect((await request(app()).get(`/db-backups/download?token=${token}`)).status).toBe(404);
  });

  it('answers 500 and logs when the lookup itself fails', async () => {
    (dbBackupService.fileFor as jest.Mock).mockRejectedValue(new Error('mongo down'));
    const res = await request(app()).get(`/db-backups/download?token=${encodeURIComponent(signDownloadToken('b1'))}`);
    expect(res.status).toBe(500);
    expect(res.text).toBe('Error\n');
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'download', { error: expect.any(Error) });
  });

  it('logs a download that breaks after the headers are out, without trying to answer again', async () => {
    good();
    const layer = (buildDbBackupRouter() as unknown as { stack: Array<{ route: { stack: Array<{ handle: (...a: unknown[]) => void }> } }> }).stack[0];
    const res: Record<string, jest.Mock> = {};
    for (const method of ['set', 'type', 'attachment']) res[method] = jest.fn(() => res);
    res.sendFile = jest.fn((_path: string, done: (err?: Error) => void) => done(new Error('client hung up')));
    layer.route.stack[0].handle({ headers: { 'x-backup-token': signDownloadToken('b1') }, query: {} }, res);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(logs.server.warn).toHaveBeenCalledWith('dbBackup', 'download', { error: expect.any(Error), file: 'duncit.dbk.gz' });
  });

  it('reads the first value when a proxy delivers the token header as a list', async () => {
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue(null);
    const layer = (buildDbBackupRouter() as unknown as { stack: Array<{ route: { stack: Array<{ handle: (...a: unknown[]) => void }> } }> }).stack[0];
    const res: Record<string, jest.Mock> = {};
    for (const method of ['set', 'status', 'type']) res[method] = jest.fn(() => res);
    res.send = jest.fn();
    layer.route.stack[0].handle({ headers: { 'x-backup-token': [signDownloadToken('listed'), 'ignored'] }, query: {} }, res);
    await new Promise((resolve) => setImmediate(resolve));
    expect(dbBackupService.fileFor).toHaveBeenCalledWith('listed');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('does not try to answer again when a failure comes after the response has already started', async () => {
    (dbBackupService.fileFor as jest.Mock).mockRejectedValue(new Error('late failure'));
    const layer = (buildDbBackupRouter() as unknown as { stack: Array<{ route: { stack: Array<{ handle: (...a: unknown[]) => void }> } }> }).stack[0];
    const res = { headersSent: true, set: jest.fn(), status: jest.fn() };
    layer.route.stack[0].handle({ headers: { 'x-backup-token': signDownloadToken('b1') }, query: {} }, res);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'download', { error: expect.any(Error) });
    expect(res.status).not.toHaveBeenCalled();
  });
});
