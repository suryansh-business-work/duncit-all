import { Types } from 'mongoose';
import { postService } from '../../post.service';
import { PostModel } from '../../post.model';

const author = new Types.ObjectId().toString();
const img = 'https://img/post.jpg';

describe('postService integration', () => {
  it('creates a post and lists/fetches it', async () => {
    const created = await postService.create(author, { image_url: img, caption: 'Hello' });
    expect(created.caption).toBe('Hello');
    expect(created.likes_count).toBe(0);

    expect(await postService.list(author)).toHaveLength(1);
    expect((await postService.getById(created.id))?.caption).toBe('Hello');
  });

  it('toggles a like and adds a comment', async () => {
    const post = await postService.create(author, { image_url: img });
    const liker = new Types.ObjectId().toString();

    const liked = await postService.toggleLike(post.id, liker);
    expect(liked.likes_count).toBe(1);
    const unliked = await postService.toggleLike(post.id, liker);
    expect(unliked.likes_count).toBe(0);

    const commented = await postService.addComment(post.id, liker, 'Nice shot');
    expect(commented.comments_count).toBe(1);
  });

  it('only lets the author delete their post', async () => {
    const post = await postService.create(author, { image_url: img });
    await expect(postService.remove(post.id, new Types.ObjectId().toString())).rejects.toThrow(/not allowed/i);
    expect(await postService.remove(post.id, author)).toBe(true);
    expect(await PostModel.countDocuments()).toBe(0);
  });

  it('stories are ephemeral, typed, and kept out of the profile grid', async () => {
    const story = await postService.create(author, {
      image_url: 'https://img/clip.mp4',
      kind: 'STORY',
      media_type: 'VIDEO',
    });
    expect(story.kind).toBe('STORY');
    expect(story.media_type).toBe('VIDEO');
    expect(story.expires_at).toBeTruthy();

    // Profile grid (list) excludes stories…
    expect(await postService.list(author)).toHaveLength(0);
    // …but the stories feed returns the active story.
    const active = await postService.listStories(author);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(story.id);
  });

  it('hides stories whose 24h window has already closed', async () => {
    const story = await postService.create(author, { image_url: img, kind: 'STORY' });
    await PostModel.updateOne({ _id: story.id }, { expires_at: new Date(Date.now() - 1000) });
    expect(await postService.listStories(author)).toHaveLength(0);
  });

  it('attaches a story to a club and lists it via clubStories (Bug 6)', async () => {
    const clubId = new Types.ObjectId().toString();
    const story = await postService.create(author, {
      image_url: img,
      kind: 'STORY',
      club_id: clubId,
    });
    expect(story.club_id).toBe(clubId);

    const clubStories = await postService.listClubStories(clubId);
    expect(clubStories.map((s) => s.id)).toEqual([story.id]);

    // A different club has none, and a club_id on a non-story is ignored.
    expect(await postService.listClubStories(new Types.ObjectId().toString())).toHaveLength(0);
    const plain = await postService.create(author, { image_url: img, club_id: clubId });
    expect(plain.club_id).toBeNull();

    // Expired club stories drop out.
    await PostModel.updateOne({ _id: story.id }, { expires_at: new Date(Date.now() - 1000) });
    expect(await postService.listClubStories(clubId)).toHaveLength(0);
  });

  it('defaults a plain post to an image kept on the profile grid', async () => {
    const post = await postService.create(author, { image_url: img });
    expect(post.kind).toBe('POST');
    expect(post.media_type).toBe('IMAGE');
    expect(post.expires_at).toBeNull();
    expect(await postService.list(author)).toHaveLength(1);
    expect(await postService.listStories(author)).toHaveLength(0);
  });
});
