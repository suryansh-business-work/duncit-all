import { Types } from 'mongoose';
import { podIdeaService } from '../../podIdea.service';
import { PodIdeaModel } from '../../podIdea.model';

const author = new Types.ObjectId().toString();

// Every idea now carries a mandatory Super › Category › Sub hierarchy — a shared
// fixture keeps the existing behavioural tests focused on what they assert.
const superId = new Types.ObjectId().toString();
const categoryId = new Types.ObjectId().toString();
const subId = new Types.ObjectId().toString();
const cats = {
  super_category_id: superId,
  category_id: categoryId,
  sub_category_id: subId,
  super_category_name: 'For You',
  category_name: 'Sports',
  sub_category_name: 'Badminton',
};
const create = (a: string, o: { title: string; description: string }) =>
  podIdeaService.create(a, { ...o, ...cats });

describe('podIdeaService integration', () => {
  it('creates an idea in PENDING with no likes', async () => {
    const idea = await create(author, { title: 'Rooftop yoga', description: 'Morning pod' });
    expect(idea.status).toBe('PENDING');
    expect(idea.likes_count).toBe(0);
    expect(idea.author_id).toBe(author);
  });

  it('stamps a unique idea_no and stores the category hierarchy', async () => {
    const first = await create(author, { title: 'A', description: 'a' });
    const second = await create(author, { title: 'B', description: 'b' });
    expect(first.idea_no).toMatch(/^DUN-\d{6,}$/);
    expect(second.idea_no).toMatch(/^DUN-\d{6,}$/);
    expect(first.idea_no).not.toBe(second.idea_no);
    expect(first.super_category_id).toBe(superId);
    expect(first.category_id).toBe(categoryId);
    expect(first.sub_category_id).toBe(subId);
    expect(first.super_category_name).toBe('For You');
    expect(first.category_name).toBe('Sports');
    expect(first.sub_category_name).toBe('Badminton');
  });

  it('rejects a create missing any level of the hierarchy', async () => {
    await expect(
      podIdeaService.create(author, {
        title: 'No cats',
        description: 'x',
        category_id: categoryId,
        sub_category_id: subId,
      })
    ).rejects.toThrow(/select a super category/i);
    await expect(
      podIdeaService.create(author, {
        title: 'No sub',
        description: 'x',
        super_category_id: superId,
        category_id: categoryId,
      })
    ).rejects.toThrow(/select a sub category/i);
  });

  it('toggles a like on and off', async () => {
    const idea = await create(author, { title: 'T', description: 'D' });
    const liker = new Types.ObjectId().toString();

    const liked = await podIdeaService.toggleLike(idea.id, liker);
    expect(liked.likes_count).toBe(1);
    expect(liked.liked_by_me).toBe(true);

    const unliked = await podIdeaService.toggleLike(idea.id, liker);
    expect(unliked.likes_count).toBe(0);
  });

  it('adds comments and returns them oldest-first', async () => {
    const idea = await create(author, { title: 'T', description: 'D' });
    const commenter = new Types.ObjectId().toString();
    await podIdeaService.addComment(idea.id, commenter, 'First');
    const commented = await podIdeaService.addComment(idea.id, commenter, 'Second');
    expect(commented.comments_count).toBe(2);
    expect(commented.comments.map((c) => c.text)).toEqual(['First', 'Second']);
  });

  it('filters by status, author, search and category level', async () => {
    await create(author, { title: 'Picnic', description: 'park' });
    await podIdeaService.create(new Types.ObjectId().toString(), {
      title: 'Trek',
      description: 'hills',
      super_category_id: new Types.ObjectId().toString(),
      category_id: new Types.ObjectId().toString(),
      sub_category_id: new Types.ObjectId().toString(),
    });

    expect(await podIdeaService.list({ author_id: author })).toHaveLength(1);
    expect(await podIdeaService.list({ search: 'trek' })).toHaveLength(1);
    expect(await podIdeaService.list({ status: 'PENDING' })).toHaveLength(2);
    // The shared fixture's Sub narrows to only the author's idea.
    expect(await podIdeaService.list({ sub_category_id: subId })).toHaveLength(1);
    expect(await podIdeaService.list({ super_category_id: superId })).toHaveLength(1);
  });

  it('maps a legacy idea (no idea_no / no categories) to safe empty defaults', async () => {
    // A pre-feature idea written straight to the collection: idea_no defaults to
    // '' and the category ids to null — the mapper must not choke on them.
    const legacy = await PodIdeaModel.create({
      author_id: new Types.ObjectId(author),
      title: 'Old idea',
      description: 'from before categories',
    });
    const mapped = await podIdeaService.getById(String(legacy._id));
    expect(mapped?.idea_no).toBe('');
    expect(mapped?.super_category_id).toBeNull();
    expect(mapped?.category_id).toBeNull();
    expect(mapped?.sub_category_id).toBeNull();
    expect(mapped?.super_category_name).toBe('');
  });

  it('searches ideas by their idea_no', async () => {
    const idea = await create(author, { title: 'Findable', description: 'by id' });
    const [found] = await podIdeaService.list({ search: idea.idea_no });
    expect(found.id).toBe(idea.id);
  });

  it('blocks a non-author non-admin from updating', async () => {
    const idea = await create(author, { title: 'T', description: 'D' });
    await expect(
      podIdeaService.update(idea.id, new Types.ObjectId().toString(), false, { title: 'Hacked' })
    ).rejects.toThrow(/not allowed/i);

    const updated = await podIdeaService.update(idea.id, author, false, { title: 'Mine edited' });
    expect(updated.title).toBe('Mine edited');
  });

  it('lets an admin set the status', async () => {
    const idea = await create(author, { title: 'T', description: 'D' });
    const approved = await podIdeaService.setStatus(idea.id, 'APPROVED', new Types.ObjectId().toString());
    expect(approved.status).toBe('APPROVED');
    expect(await PodIdeaModel.countDocuments()).toBe(1);
  });

  it('serves the podIdeasTable page with search, status filter, sort and paging', async () => {
    const rooftop = await create(author, { title: 'Rooftop cinema', description: 'Movies' });
    await create(author, { title: 'Beach cleanup', description: 'Sunday drive' });
    const chess = await create(author, { title: 'Chess night', description: 'Blitz games' });
    await podIdeaService.setStatus(chess.id, 'APPROVED');

    // Default envelope: newest first (created_at desc) with clamp defaults.
    const all = await podIdeaService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].title).toBe('Chess night');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title AND description.
    const byTitle = await podIdeaService.table({ search: 'beach' });
    expect(byTitle.rows.map((r) => r.title)).toEqual(['Beach cleanup']);
    const byDescription = await podIdeaService.table({ search: 'blitz' });
    expect(byDescription.rows.map((r) => r.title)).toEqual(['Chess night']);

    // Enum filter narrows.
    const approvedOnly = await podIdeaService.table({
      filters: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
    });
    expect(approvedOnly.rows.map((r) => r.title)).toEqual(['Chess night']);
    expect(approvedOnly.total).toBe(1);

    // Allowlisted sort, both the order and paging over it.
    const sorted = await podIdeaService.table({ sort_by: 'title', sort_dir: 'asc' });
    expect(sorted.rows.map((r) => r.title)).toEqual(['Beach cleanup', 'Chess night', 'Rooftop cinema']);
    const page2 = await podIdeaService.table({ sort_by: 'title', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r.title)).toEqual(['Chess night']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);

    // Viewer-aware liked_by_me flows through the same mapper as list().
    const liker = new Types.ObjectId().toString();
    await podIdeaService.toggleLike(rooftop.id, liker);
    const asLiker = await podIdeaService.table({ search: 'rooftop' }, liker);
    expect(asLiker.rows[0].liked_by_me).toBe(true);
  });
});
