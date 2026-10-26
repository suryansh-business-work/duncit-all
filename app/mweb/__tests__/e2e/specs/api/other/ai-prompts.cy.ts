/// <reference types="cypress" />
import { rest } from '../../../support/api-other';

/**
 * The AI Library's open JSON feed (server/src/modules/ai/prompt/prompt.router.ts):
 *
 *   GET /ai-prompts/prompts.json   {count, prompts} — ACTIVE rows only
 *   GET /ai-prompts/prompt.json    one prompt by ?key=; 400 KEY_REQUIRED without
 *                                  one, 404 NOT_FOUND for an unknown or inactive key
 *
 * Open by product decision (no login, no key), so what it must never do is
 * just as much the contract: never cached, never indexed, and never a prompt's
 * author or usage sites. Scenario map: Other › AI prompts ("Public prompt feed
 * errors").
 */

const FEED_KEYS = [
  'key',
  'kind',
  'role',
  'name',
  'description',
  'category',
  'target_model',
  'content',
  'variables',
  'token_count',
  'updated_at',
];

interface Feed {
  count: number;
  prompts: Array<Record<string, unknown>>;
}

const expectNoStore = (headers: Record<string, string | string[]>) => {
  expect(headers['cache-control']).to.equal('no-store, max-age=0');
  expect(headers['x-robots-tag']).to.equal('noindex, nofollow');
};

describe('API · The open prompt feed answers its documented shape and errors', { testIsolation: false }, () => {
  it('AP-01 prompts.json opens with count and prompts, uncached and unindexed', () => {
    rest<Feed>('GET', '/ai-prompts/prompts.json').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.count).to.equal(res.body.prompts.length);
      expectNoStore(res.headers);
    });
  });

  it("AP-02 every prompt carries only the feed's fields — never its author or usage sites", () => {
    rest<Feed>('GET', '/ai-prompts/prompts.json').then((res) => {
      res.body.prompts.forEach((prompt) => {
        // Unset fields drop out of JSON, so the keys are a subset — but never anything outside it.
        expect(FEED_KEYS, String(prompt.key)).to.include.members(Object.keys(prompt));
        expect(prompt).to.include.keys('key', 'kind', 'content');
      });
    });
  });

  it('AP-03 the kind filter only returns that kind', () => {
    rest<Feed>('GET', '/ai-prompts/prompts.json', { qs: { kind: 'code' } }).then((res) => {
      expect(res.status).to.equal(200);
      res.body.prompts.forEach((prompt) => expect(prompt.kind, String(prompt.key)).to.equal('CODE'));
    });
  });

  it('AP-04 prompt.json without a key is 400 KEY_REQUIRED', () => {
    rest('GET', '/ai-prompts/prompt.json').then((res) => {
      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({
        error: 'KEY_REQUIRED',
        message: 'Pass ?key= — the prompt key, as listed by /ai-prompts/prompts.json.',
      });
      expectNoStore(res.headers);
    });
  });

  it('AP-05 an unknown key is 404 NOT_FOUND, indistinguishable from an inactive one', () => {
    const key = 'e2e.no-such-prompt';
    rest('GET', '/ai-prompts/prompt.json', { qs: { key } }).then((res) => {
      expect(res.status).to.equal(404);
      expect(res.body).to.deep.equal({ error: 'NOT_FOUND', message: `No active prompt named "${key}".` });
    });
  });

  it('AP-06 a listed prompt is served by its key with the same fields', () => {
    rest<Feed>('GET', '/ai-prompts/prompts.json').then((list) => {
      // The library is seeded at boot (bootstrap safeSeed), so staging always lists prompts.
      expect(list.body.prompts, 'the seeded library is listed').to.not.be.empty;
      const [first] = list.body.prompts;
      rest<Record<string, unknown>>('GET', '/ai-prompts/prompt.json', { qs: { key: String(first.key) } }).then((res) => {
        expect(res.status).to.equal(200);
        expect(FEED_KEYS).to.include.members(Object.keys(res.body));
        expect(res.body.key).to.equal(first.key);
      });
    });
  });
});
