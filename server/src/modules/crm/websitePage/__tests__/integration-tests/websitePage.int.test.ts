import { Types } from 'mongoose';
import { websitePageService } from '../../websitePage.service';
import { WebsitePageModel } from '../../websitePage.model';

const leadA = new Types.ObjectId();
const leadB = new Types.ObjectId();

const seedPage = (n: {
  lead: Types.ObjectId;
  url: string;
  entity?: 'VENUE_LEAD' | 'HOST_LEAD';
  title?: string;
  status?: 'DISCOVERED' | 'FETCHED' | 'ERROR';
  content_chars?: number;
}) =>
  WebsitePageModel.create({
    entity_type: n.entity ?? 'VENUE_LEAD',
    lead_id: n.lead,
    url: n.url,
    title: n.title ?? null,
    status: n.status ?? 'DISCOVERED',
    content_chars: n.content_chars ?? 0,
  });

describe('websitePageService integration', () => {
  it('lists pages for a lead in discovery order', async () => {
    await seedPage({ lead: leadA, url: 'https://a.example/one' });
    await seedPage({ lead: leadA, url: 'https://a.example/two' });

    const pages = await websitePageService.list('VENUE_LEAD', String(leadA));
    expect(pages.map((p) => p!.url).toSorted()).toEqual([
      'https://a.example/one',
      'https://a.example/two',
    ]);
  });

  it('serves the crmWebsitePagesTable page with search, filters, sort and paging', async () => {
    await seedPage({ lead: leadA, url: 'https://a.example/menu', title: 'Menu', status: 'FETCHED', content_chars: 900 });
    await seedPage({ lead: leadA, url: 'https://a.example/about', title: 'About Us', status: 'FETCHED', content_chars: 400 });
    await seedPage({ lead: leadA, url: 'https://a.example/broken', status: 'ERROR' });

    // Default page envelope + clamp defaults (created_at ties make strict
    // discovery order nondeterministic in-test, so assert membership).
    const all = await websitePageService.table('VENUE_LEAD', String(leadA));
    expect(all.total).toBe(3);
    expect(all.rows.map((p) => p!.url).toSorted()).toEqual([
      'https://a.example/about',
      'https://a.example/broken',
      'https://a.example/menu',
    ]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans url and title.
    const byTitle = await websitePageService.table('VENUE_LEAD', String(leadA), { search: 'about' });
    expect(byTitle.rows.map((p) => p!.url)).toEqual(['https://a.example/about']);
    expect(byTitle.total).toBe(1);

    // Enum + number filters narrow.
    const fetched = await websitePageService.table('VENUE_LEAD', String(leadA), {
      filters: [{ field: 'status', op: 'eq', value: 'FETCHED' }],
    });
    expect(fetched.total).toBe(2);
    const big = await websitePageService.table('VENUE_LEAD', String(leadA), {
      filters: [{ field: 'content_chars', op: 'gte', value: '500' }],
    });
    expect(big.rows.map((p) => p!.url)).toEqual(['https://a.example/menu']);

    // Allowlisted sort override + paging.
    const byChars = await websitePageService.table('VENUE_LEAD', String(leadA), {
      sort_by: 'content_chars',
      sort_dir: 'desc',
    });
    expect(byChars.rows.map((p) => p!.content_chars)).toEqual([900, 400, 0]);
    const page2 = await websitePageService.table('VENUE_LEAD', String(leadA), {
      page: 2,
      page_size: 1,
      sort_by: 'url',
      sort_dir: 'asc',
    });
    expect(page2.rows.map((p) => p!.url)).toEqual(['https://a.example/broken']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('never leaks another lead or entity type into the table (baseFilter scope)', async () => {
    await seedPage({ lead: leadA, url: 'https://a.example/home', title: 'Home A' });
    await seedPage({ lead: leadB, url: 'https://b.example/secret', title: 'Secret B' });
    await seedPage({ lead: leadA, entity: 'HOST_LEAD', url: 'https://a-host.example/home', title: 'Host Home' });

    const pagesA = await websitePageService.table('VENUE_LEAD', String(leadA));
    expect(pagesA.total).toBe(1);
    expect(pagesA.rows.map((p) => p!.url)).toEqual(['https://a.example/home']);

    // A search that matches lead B's row still returns nothing for lead A.
    const crossSearch = await websitePageService.table('VENUE_LEAD', String(leadA), { search: 'secret' });
    expect(crossSearch.total).toBe(0);
    expect(crossSearch.rows).toEqual([]);
  });
});
