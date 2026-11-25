import { describe, expect, it } from 'vitest';
import { CRM_WEBSITE_PAGE_STATUS_TONE, CRM_WEBSITE_SCRAPE_LIMIT, crmUnfetchedPages } from '../src/crm-website-pages';

/** A lead's Website tab: page statuses, the scrape limit and what is left to fetch. */

describe('website pages', () => {
  it('reads a fetched page as success and a failed one as an error', () => {
    expect(CRM_WEBSITE_PAGE_STATUS_TONE).toEqual({ DISCOVERED: 'default', FETCHED: 'success', ERROR: 'error' });
  });

  it('lets one scrape discover 1 to 200 pages, 20 to start with', () => {
    expect(CRM_WEBSITE_SCRAPE_LIMIT).toEqual({ min: 1, max: 200, initial: 20 });
  });

  it('leaves discovered and failed pages for Fetch all, in order', () => {
    const pages = [
      { id: 'a', status: 'FETCHED' },
      { id: 'b', status: 'DISCOVERED' },
      { id: 'c', status: 'ERROR' },
    ];
    expect(crmUnfetchedPages(pages).map((p) => p.id)).toEqual(['b', 'c']);
    expect(crmUnfetchedPages([])).toEqual([]);
  });
});
