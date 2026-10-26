import { TOOL_NAME_PATTERN } from '../../mcp.constants';
import { categoryPrefix, snakeCase, titleOf, toolNameFor, wordsOf } from '../../catalog/naming';

describe('wordsOf', () => {
  it.each([
    ['podsTable', ['pods', 'table']],
    ['createPod', ['create', 'pod']],
    ['pod_hashtag', ['pod', 'hashtag']],
    ['partner-brand', ['partner', 'brand']],
    ['approvePaymentRelease', ['approve', 'payment', 'release']],
  ])('splits %s into its lower-case words', (identifier, words) => {
    expect(wordsOf(identifier)).toEqual(words);
  });

  it('keeps a digit-bearing acronym the API spells in camelCase as one word (createE2eRun)', () => {
    expect(wordsOf('createE2eRun')).toEqual(['create', 'e2e', 'run']);
    expect(wordsOf('triggerE2eRun')).toEqual(['trigger', 'e2e', 'run']);
  });

  it('separates an upper-case acronym from the word after it (getURLConfig)', () => {
    expect(wordsOf('getURLConfig')).toEqual(['get', 'url', 'config']);
    expect(wordsOf('HTMLParser')).toEqual(['html', 'parser']);
  });

  it('splits on underscores, hyphens and whitespace and drops empty pieces', () => {
    expect(wordsOf('  __pod--title  name_')).toEqual(['pod', 'title', 'name']);
  });

  it('returns no words for an empty identifier', () => {
    expect(wordsOf('')).toEqual([]);
    expect(wordsOf('___')).toEqual([]);
  });

  it('keeps an identifier that is a single word as one word', () => {
    expect(wordsOf('me')).toEqual(['me']);
    expect(wordsOf('ME')).toEqual(['me']);
  });
});

describe('snakeCase / categoryPrefix / toolNameFor', () => {
  it('snake-cases a camelCase field name', () => {
    expect(snakeCase('venueSlotsForDate')).toBe('venue_slots_for_date');
  });

  it('turns a hyphenated category key into a tool-name prefix', () => {
    expect(categoryPrefix('partner-brand')).toBe('partner_brand');
    expect(categoryPrefix('gig-jobs')).toBe('gig_jobs');
    expect(categoryPrefix('pods')).toBe('pods');
  });

  it('names a tool <category>_<snake field>, as the README documents', () => {
    expect(toolNameFor('pods', 'podsTable')).toBe('pods_pods_table');
    expect(toolNameFor('partner-brand', 'productOrdersTable')).toBe('partner_brand_product_orders_table');
    expect(toolNameFor('tech', 'createE2eRun')).toBe('tech_create_e2e_run');
  });

  it('produces names every MCP client accepts', () => {
    for (const name of [toolNameFor('ecomm-store', 'storeAdminSetSubscriptionStatus'), toolNameFor('finance', 'getURLConfig')]) {
      expect(name).toMatch(TOOL_NAME_PATTERN);
    }
  });
});

describe('titleOf', () => {
  it('makes a sentence-case title from a field name', () => {
    expect(titleOf('createPod')).toBe('Create pod');
    expect(titleOf('podsTable')).toBe('Pods table');
    expect(titleOf('getURLConfig')).toBe('Get url config');
  });

  it('returns an empty title for an empty identifier instead of throwing', () => {
    expect(titleOf('')).toBe('');
  });
});
