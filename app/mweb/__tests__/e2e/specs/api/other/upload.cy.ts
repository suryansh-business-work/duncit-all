/// <reference types="cypress" />
import { rest } from '../../../support/api-other';

/**
 * POST /upload refuses anything without a live upload ticket before reading a
 * single byte (server/src/routes/upload.router.ts: `spendUploadTicket` is the
 * first statement). Unknown, spent and expired tickets get the SAME answer on
 * purpose, so a guesser learns nothing. Scenario map: Other › Upload ("Upload
 * negative paths").
 *
 * No file is ever sent: a real upload would land in a shared ImageKit folder.
 * The happy path and the single-use/expiry of a REAL ticket need a ticket
 * minted for the run (see the run report); the Uploads rate-limit rule is
 * never driven to its ceiling from the runner.
 */

const REFUSED = { message: 'This upload link is no longer valid. Try again.' };

describe('API · Uploads refuse a missing or unknown ticket', { testIsolation: false }, () => {
  it('UP-01 no ticket at all is 401 with the generic message', () => {
    rest('POST', '/upload').then((res) => {
      expect(res.status).to.equal(401);
      expect(res.body).to.deep.equal(REFUSED);
    });
  });

  it('UP-02 an unknown ticket gets exactly the same answer', () => {
    rest('POST', '/upload', { qs: { ticket: 'e2e-no-such-ticket', fileName: 'e2e.png' } }).then((res) => {
      expect(res.status).to.equal(401);
      expect(res.body).to.deep.equal(REFUSED);
    });
  });
});
