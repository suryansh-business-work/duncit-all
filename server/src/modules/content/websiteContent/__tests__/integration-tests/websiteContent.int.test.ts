import { websiteContentService } from '../../websiteContent.service';

describe('websiteContentService integration', () => {
  it('serves the websiteContentTable page with search, filter, sort and paging', async () => {
    await websiteContentService.create({ type: 'BLOG', title: 'Alpha Post', category: 'Product', sort_order: 1 });
    await websiteContentService.create({ type: 'BLOG', title: 'Beta Post', category: 'Safety', sort_order: 2, is_published: false });
    await websiteContentService.create({ type: 'CAREERS', title: 'Gamma Role', category: 'Engineering', sort_order: 3 });

    // Plain envelope with the default sort (sort_order asc, like the list) and clamp defaults.
    const all = await websiteContentService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r.title)).toEqual(['Alpha Post', 'Beta Post', 'Gamma Role']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title, slug and category.
    const searched = await websiteContentService.table({ search: 'beta' });
    expect(searched.rows.map((r) => r.title)).toEqual(['Beta Post']);
    expect(searched.total).toBe(1);
    const byCategory = await websiteContentService.table({ search: 'engineering' });
    expect(byCategory.rows.map((r) => r.title)).toEqual(['Gamma Role']);

    // The per-route dataset switch (CAREERS/NEWSROOM/BLOG) becomes an enum filter.
    const blogs = await websiteContentService.table({
      filters: [{ field: 'type', op: 'eq', value: 'BLOG' }],
    });
    expect(blogs.total).toBe(2);

    // Boolean filter narrows.
    const published = await websiteContentService.table({
      filters: [{ field: 'is_published', op: 'is_true' }],
    });
    expect(published.rows.map((r) => r.title)).toEqual(['Alpha Post', 'Gamma Role']);

    // Allowlisted sort + paging keep total and report the clamps back.
    const byTitleDesc = await websiteContentService.table({ sort_by: 'title', sort_dir: 'desc' });
    expect(byTitleDesc.rows.map((r) => r.title)).toEqual(['Gamma Role', 'Beta Post', 'Alpha Post']);

    const page2 = await websiteContentService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r.title)).toEqual(['Beta Post']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
