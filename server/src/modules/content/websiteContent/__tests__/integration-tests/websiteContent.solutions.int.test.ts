/**
 * duncit.com/solutions entries, against a real database: what a SOLUTIONS row
 * must carry (an audience and a category), the URL segment its category
 * becomes, that no other page type can be filed under an audience, and the
 * Venue Kit seed that is inserted once and never overwritten.
 */
import { validate } from '@utils/validate';
import { WebsiteContentModel } from '../../websiteContent.model';
import { websiteContentService } from '../../websiteContent.service';
import { websiteContentInputSchema } from '../../websiteContent.validator';

const solution = (over: Record<string, unknown> = {}) => ({
  type: 'SOLUTIONS',
  title: 'Duncit Venue Kit',
  slug: 'venue-kit',
  category: 'Cafe & Restaurant Automation',
  audience: 'VENUE',
  coming_soon: true,
  ...over,
});

beforeEach(async () => {
  await WebsiteContentModel.deleteMany({});
});

describe('a SOLUTIONS entry', () => {
  it('is filed under its audience and category, and its category becomes the URL segment', async () => {
    const data = await validate(websiteContentInputSchema, solution());
    const created = await websiteContentService.create(data);
    expect(created).toMatchObject({
      type: 'SOLUTIONS',
      slug: 'venue-kit',
      audience: 'VENUE',
      coming_soon: true,
      category: 'Cafe & Restaurant Automation',
      category_slug: 'cafe-restaurant-automation',
    });
    const listed = await websiteContentService.list('SOLUTIONS', true);
    expect(listed.map((row) => `/solutions/${row.category_slug}/${row.slug}`)).toEqual([
      '/solutions/cafe-restaurant-automation/venue-kit',
    ]);
  });

  it('refuses a solution without an audience or a category, and an audience on any other type', async () => {
    await expect(validate(websiteContentInputSchema, solution({ audience: null }))).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', errors: expect.arrayContaining(['Choose who this solution is for']) },
    });
    await expect(validate(websiteContentInputSchema, solution({ category: '  ' }))).rejects.toMatchObject({
      extensions: { errors: expect.arrayContaining(['A solution needs a category']) },
    });
    await expect(validate(websiteContentInputSchema, solution({ audience: 'GUEST' }))).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(
      validate(websiteContentInputSchema, { type: 'BLOG', title: 'Post', audience: 'HOST' })
    ).rejects.toMatchObject({ extensions: { errors: expect.arrayContaining(['Only a solution has an audience']) } });
  });

  it('never stores an audience or a coming-soon flag on another page type', async () => {
    const created = await websiteContentService.create({ type: 'BLOG', title: 'A post', audience: 'HOST', coming_soon: true });
    expect(created).toMatchObject({ audience: null, coming_soon: false, category_slug: '' });
  });

  it('keeps a solution off the public list while it is unpublished, and filters the admin table by audience', async () => {
    await websiteContentService.create(solution());
    await websiteContentService.create(solution({ slug: 'host-tools', title: 'Host tools', audience: 'HOST', is_published: false }));
    expect((await websiteContentService.list('SOLUTIONS', true)).map((r) => r.slug)).toEqual(['venue-kit']);
    const hosts = await websiteContentService.table({ filters: [{ field: 'audience', op: 'in', values: ['HOST'] }] });
    expect(hosts.rows.map((r) => r.slug)).toEqual(['host-tools']);
  });
});

describe('the Venue Kit seed', () => {
  it('inserts the Venue Kit under venues once, and never overwrites what the Website portal changed', async () => {
    await websiteContentService.seedDefaults();
    const [seeded] = await websiteContentService.list('SOLUTIONS', true);
    expect(seeded).toMatchObject({
      slug: 'venue-kit',
      audience: 'VENUE',
      coming_soon: true,
      category_slug: 'cafe-restaurant-automation',
    });

    await websiteContentService.update(seeded.id, { ...solution(), title: 'Venue Kit by Duncit', coming_soon: false });
    await websiteContentService.seedDefaults();
    const rows = await websiteContentService.list('SOLUTIONS', false);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Venue Kit by Duncit', coming_soon: false });
  });

  it('still seeds the Venue Kit on a platform that already has blog posts', async () => {
    await websiteContentService.create({ type: 'BLOG', title: 'Existing post' });
    await websiteContentService.seedDefaults();
    expect(await WebsiteContentModel.countDocuments({ type: 'SOLUTIONS', slug: 'venue-kit' })).toBe(1);
    expect(await WebsiteContentModel.countDocuments({ type: 'BLOG' })).toBe(1);
  });
});
