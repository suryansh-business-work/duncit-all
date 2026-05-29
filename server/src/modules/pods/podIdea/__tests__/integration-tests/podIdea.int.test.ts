import { Types } from 'mongoose';
import { podIdeaService } from '../../podIdea.service';
import { PodIdeaModel } from '../../podIdea.model';

const author = new Types.ObjectId().toString();

describe('podIdeaService integration', () => {
  it('creates an idea in PENDING with no likes', async () => {
    const idea = await podIdeaService.create(author, { title: 'Rooftop yoga', description: 'Morning pod' });
    expect(idea.status).toBe('PENDING');
    expect(idea.likes_count).toBe(0);
    expect(idea.author_id).toBe(author);
  });

  it('toggles a like on and off', async () => {
    const idea = await podIdeaService.create(author, { title: 'T', description: 'D' });
    const liker = new Types.ObjectId().toString();

    const liked = await podIdeaService.toggleLike(idea.id, liker);
    expect(liked.likes_count).toBe(1);
    expect(liked.liked_by_me).toBe(true);

    const unliked = await podIdeaService.toggleLike(idea.id, liker);
    expect(unliked.likes_count).toBe(0);
  });

  it('adds a comment', async () => {
    const idea = await podIdeaService.create(author, { title: 'T', description: 'D' });
    const commented = await podIdeaService.addComment(idea.id, new Types.ObjectId().toString(), 'Love this');
    expect(commented.comments_count).toBe(1);
    expect(commented.comments[0].text).toBe('Love this');
  });

  it('filters by status, author and search', async () => {
    await podIdeaService.create(author, { title: 'Picnic', description: 'park' });
    await podIdeaService.create(new Types.ObjectId().toString(), { title: 'Trek', description: 'hills' });

    expect(await podIdeaService.list({ author_id: author })).toHaveLength(1);
    expect(await podIdeaService.list({ search: 'trek' })).toHaveLength(1);
    expect(await podIdeaService.list({ status: 'PENDING' })).toHaveLength(2);
  });

  it('blocks a non-author non-admin from updating', async () => {
    const idea = await podIdeaService.create(author, { title: 'T', description: 'D' });
    await expect(
      podIdeaService.update(idea.id, new Types.ObjectId().toString(), false, { title: 'Hacked' })
    ).rejects.toThrow(/not allowed/i);

    const updated = await podIdeaService.update(idea.id, author, false, { title: 'Mine edited' });
    expect(updated.title).toBe('Mine edited');
  });

  it('lets an admin set the status', async () => {
    const idea = await podIdeaService.create(author, { title: 'T', description: 'D' });
    const approved = await podIdeaService.setStatus(idea.id, 'APPROVED', new Types.ObjectId().toString());
    expect(approved.status).toBe('APPROVED');
    expect(await PodIdeaModel.countDocuments()).toBe(1);
  });
});
