/// <reference types="cypress" />
import { forgedSignedLink, rest, textOf } from '../../../support/api-other';

/**
 * Reel Studio's Drive media, GET /reels/media/:token and /reels/thumbnail/:token
 * (server/src/modules/ai/reel/reel.router.ts). No session: the signed token in
 * the path is the whole credential (reel.media.ts → utils/signed-link.ts), and
 * a token that does not verify is answered 404 "Not found" BEFORE Google Drive
 * is asked for anything — a Range header changes nothing about that. Scenario
 * map: Other › Reel Studio media.
 *
 * The 206-with-the-requested-bytes half needs a real signed link to a Drive
 * file (see the run report).
 */

const NOT_FOUND = 'Not found\n';

const expectNotFound = (path: string, headers: Record<string, string> = {}) =>
  rest('GET', path, { headers }).then((res) => {
    expect(res.status, path).to.equal(404);
    expect(textOf(res.body), path).to.equal(NOT_FOUND);
    // Nothing was streamed: no byte range, no Drive headers passed through.
    expect(res.headers['content-range'], path).to.be.undefined;
    expect(res.headers['accept-ranges'], path).to.be.undefined;
  });

describe('API · Reel media refuses tokens it did not sign', { testIsolation: false }, () => {
  it('RM-01 a token that is not a signed link is 404', () => {
    expectNotFound('/reels/media/not-a-token');
  });

  it('RM-02 a well-formed token with a forged signature is 404, even for a range request', () => {
    expectNotFound(`/reels/media/${forgedSignedLink()}`, { range: 'bytes=0-1023' });
  });

  it('RM-03 the thumbnail route refuses the same forged token', () => {
    expectNotFound(`/reels/thumbnail/${forgedSignedLink()}`);
  });
});
