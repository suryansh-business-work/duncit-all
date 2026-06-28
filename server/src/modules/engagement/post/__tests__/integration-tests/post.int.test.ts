import { Types } from 'mongoose';
import { postService } from '../../post.service';
import { PostModel } from '../../post.model';
import { UserNotificationModel } from '@modules/engagement/notification/notification.model';
import { notificationService } from '@modules/engagement/notification/notification.service';

const author = new Types.ObjectId().toString();
const img = 'https://img/post.jpg';

// Post like/comment notifications are fired-and-forgotten (dynamic import +
// async fan-out). Spy on create() so each test can await the in-flight
// notification promises before the DB is wiped in afterEach — otherwise the
// trailing save() races the teardown.
let notifyPromises: Promise<unknown>[] = [];
const realCreate = notificationService.create.bind(notificationService);
beforeEach(() => {
  notifyPromises = [];
  jest.spyOn(notificationService, 'create').mockImplementation((input, sentBy) => {
    const p = realCreate(input, sentBy);
    notifyPromises.push(p.catch(() => undefined));
    return p;
  });
});
afterEach(async () => {
  await Promise.all(notifyPromises);
  jest.restoreAllMocks();
});

const settleNotifs = () => Promise.all(notifyPromises);

describe('postService integration', () => {
  it('creates a post and lists/fetches it', async () => {
    const created = await postService.create(author, { image_url: img, caption: 'Hello' });
    expect(created.caption).toBe('Hello');
    expect(created.likes_count).toBe(0);

    expect(await postService.list(author)).toHaveLength(1);
    expect((await postService.getById(created.id))?.caption).toBe('Hello');
  });

  it('toggles a like and adds a comment', async () => {
    // Own author so this test's fire-and-forget notifications never collide
    // with the dedicated notification assertions below.
    const owner = new Types.ObjectId().toString();
    const post = await postService.create(owner, { image_url: img });
    const liker = new Types.ObjectId().toString();

    const liked = await postService.toggleLike(post.id, liker);
    expect(liked.likes_count).toBe(1);
    const unliked = await postService.toggleLike(post.id, liker);
    expect(unliked.likes_count).toBe(0);

    const commented = await postService.addComment(post.id, liker, 'Nice shot');
    expect(commented.comments_count).toBe(1);
    await settleNotifs();
  });

  it('notifies the post owner on a like (to-liked) and a comment, deep-linking to the post', async () => {
    // Fresh owner so only this test's actions notify them.
    const owner = new Types.ObjectId().toString();
    const post = await postService.create(owner, { image_url: img });
    const actor = new Types.ObjectId().toString();

    await postService.toggleLike(post.id, actor);
    await postService.addComment(post.id, actor, 'Love this');
    await settleNotifs();

    const inbox = await UserNotificationModel.find({
      user_id: new Types.ObjectId(owner),
    }).populate('notification_id');
    const notifs = inbox.map((n) => n.notification_id as any);
    expect(notifs).toHaveLength(2);
    const like = notifs.find((n: any) => n.title === 'New like on your post');
    const comment = notifs.find((n: any) => n.title === 'New comment on your post');
    expect(like?.link_url).toBe(`/post/${post.id}`);
    expect(like?.body).toContain('liked your post');
    expect(comment?.link_url).toBe(`/post/${post.id}`);
    expect(comment?.body).toContain('commented on your post');
  });

  it('never notifies the owner for their own like/comment, nor on an unlike', async () => {
    const owner = new Types.ObjectId().toString();
    const post = await postService.create(owner, { image_url: img });
    const actor = new Types.ObjectId().toString();

    // Owner liking/commenting on their own post → no self-notify.
    await postService.toggleLike(post.id, owner);
    await postService.addComment(post.id, owner, 'self note');
    // A like immediately followed by an unlike → exactly one notification.
    await postService.toggleLike(post.id, actor);
    await postService.toggleLike(post.id, actor);
    await settleNotifs();
    const inbox = await UserNotificationModel.find({ user_id: new Types.ObjectId(owner) });
    expect(inbox).toHaveLength(1);
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
