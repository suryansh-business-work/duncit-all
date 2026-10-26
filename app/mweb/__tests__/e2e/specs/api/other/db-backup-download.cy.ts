/// <reference types="cypress" />
import { forgedSignedLink, rest, textOf } from '../../../support/api-other';

/**
 * Database backup archives leave only through
 * GET /db-backups/download?token=… (or the x-backup-token header) —
 * server/src/modules/platform/dbBackup/dbBackup.router.ts. nginx serves no
 * location for them, so this signed, minutes-long link is the only door, and
 * anything it cannot verify is 404 "Not found", uncached, with no archive
 * named. Scenario map: Other › DB backup download. The research row's
 * `/db-backups/:token` path does not exist; the token rides in the query.
 *
 * A valid link names a real archive of the whole database; the suite never
 * mints or follows one.
 */

const PATH = '/db-backups/download';

const expectNotFound = (init: { qs?: Record<string, string>; headers?: Record<string, string> }) =>
  rest('GET', PATH, init).then((res) => {
    expect(res.status).to.equal(404);
    expect(textOf(res.body)).to.equal('Not found\n');
    expect(res.headers['cache-control']).to.equal('no-store, max-age=0');
    expect(res.headers['content-disposition'], 'no archive is offered').to.be.undefined;
  });

describe('API · Backup downloads refuse anything but a valid signed link', { testIsolation: false }, () => {
  it('DB-01 no token is 404', () => {
    expectNotFound({});
  });

  it('DB-02 a token that is not a signed link is 404', () => {
    expectNotFound({ qs: { token: 'not-a-token' } });
  });

  it('DB-03 a forged signed link is 404, from the query string or the header', () => {
    expectNotFound({ qs: { token: forgedSignedLink() } });
    expectNotFound({ headers: { 'x-backup-token': forgedSignedLink() } });
  });
});
