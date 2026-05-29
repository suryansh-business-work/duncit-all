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
});
