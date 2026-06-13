import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

async function makeUser(first: string, bio?: string) {
  const u = await UserModel.create({
    auth: { email: `${first}-${Date.now()}-${Math.random()}@duncit.com`, password: 'x' },
    profile: { first_name: first, last_name: 'Test', bio: bio ?? null },
  });
  return String(u._id);
}

const SET_VISIBILITY = gql`
  mutation SetVis($v: ProfileVisibility!) {
    updateMyProfileVisibility(visibility: $v) {
      user_id
      profile_visibility
    }
  }
`;

const PUBLIC_PROFILE = gql`
  query Pub($id: ID!) {
    publicUserProfile(user_id: $id) {
      user_id
      bio
      is_private
      is_following
      can_view_content
    }
  }
`;

const FOLLOW = gql`
  mutation Fol($id: ID!) {
    followUser(user_id: $id) {
      user_id
    }
  }
`;

const POSTS = gql`
  query Posts($id: ID!) {
    posts(author_id: $id) {
      id
    }
  }
`;

const STORIES = gql`
  query Stories($id: ID!) {
    stories(author_id: $id) {
      id
    }
  }
`;

const CREATE_POST = gql`
  mutation CP($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

const MY_NOTIFS = gql`
  query MyNotifs {
    myNotifications {
      notification {
        title
        body
        link_url
      }
    }
  }
`;

describe('profile privacy + follow notification e2e', () => {
  it('hides a private profile and its posts/stories from non-followers, then reveals on follow', async () => {
    const bobId = await makeUser('Bob', 'Bob bio');
    const aliceId = await makeUser('Alice');
    const bob = server.client(signToken({ id: bobId, roles: ['USER'] }));
    const alice = server.client(signToken({ id: aliceId, roles: ['USER'] }));

    // Bob goes private and publishes a post + a story.
    const setRes = await bob.request<{ updateMyProfileVisibility: { profile_visibility: string } }>(
      SET_VISIBILITY,
      { v: 'PRIVATE' }
    );
    expect(setRes.updateMyProfileVisibility.profile_visibility).toBe('PRIVATE');
    await bob.request(CREATE_POST, { input: { image_url: 'https://img/x.jpg', kind: 'POST' } });
    await bob.request(CREATE_POST, { input: { image_url: 'https://img/s.jpg', kind: 'STORY' } });

    // Anon and a non-follower cannot see Bob's content or bio.
    const anon = server.client();
    expect((await anon.request<{ posts: unknown[] }>(POSTS, { id: bobId })).posts).toHaveLength(0);
    const beforeProfile = await alice.request<{ publicUserProfile: any }>(PUBLIC_PROFILE, {
      id: bobId,
    });
    expect(beforeProfile.publicUserProfile.is_private).toBe(true);
    expect(beforeProfile.publicUserProfile.is_following).toBe(false);
    expect(beforeProfile.publicUserProfile.can_view_content).toBe(false);
    expect(beforeProfile.publicUserProfile.bio).toBeNull();
    expect((await alice.request<{ posts: unknown[] }>(POSTS, { id: bobId })).posts).toHaveLength(0);
    expect(
      (await alice.request<{ stories: unknown[] }>(STORIES, { id: bobId })).stories
    ).toHaveLength(0);

    // Alice follows Bob.
    await alice.request(FOLLOW, { id: bobId });

    // Now everything is visible to Alice and Bob got a notification.
    const afterProfile = await alice.request<{ publicUserProfile: any }>(PUBLIC_PROFILE, {
      id: bobId,
    });
    expect(afterProfile.publicUserProfile.is_following).toBe(true);
    expect(afterProfile.publicUserProfile.can_view_content).toBe(true);
    expect(afterProfile.publicUserProfile.bio).toBe('Bob bio');
    expect((await alice.request<{ posts: unknown[] }>(POSTS, { id: bobId })).posts).toHaveLength(1);
    expect(
      (await alice.request<{ stories: unknown[] }>(STORIES, { id: bobId })).stories
    ).toHaveLength(1);

    const notifs = await bob.request<{ myNotifications: { notification: any }[] }>(MY_NOTIFS);
    const follow = notifs.myNotifications.find((n) => n.notification?.title === 'New follower');
    expect(follow?.notification.body).toContain('Alice Test');
    expect(follow?.notification.link_url).toBe(`/u/${aliceId}`);

    // Following again is a no-op: no duplicate notification.
    await alice.request(FOLLOW, { id: bobId });
    const notifs2 = await bob.request<{ myNotifications: { notification: any }[] }>(MY_NOTIFS);
    const followCount = notifs2.myNotifications.filter(
      (n) => n.notification?.title === 'New follower'
    ).length;
    expect(followCount).toBe(1);
  });

  it('keeps public profiles and their posts open to everyone', async () => {
    const publicId = await makeUser('Open', 'open bio');
    const pub = server.client(signToken({ id: publicId, roles: ['USER'] }));
    await pub.request(CREATE_POST, { input: { image_url: 'https://img/o.jpg', kind: 'POST' } });

    const viewer = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const profile = await viewer.request<{ publicUserProfile: any }>(PUBLIC_PROFILE, {
      id: publicId,
    });
    expect(profile.publicUserProfile.is_private).toBe(false);
    expect(profile.publicUserProfile.can_view_content).toBe(true);
    expect(profile.publicUserProfile.bio).toBe('open bio');
    expect((await viewer.request<{ posts: unknown[] }>(POSTS, { id: publicId })).posts).toHaveLength(
      1
    );
  });

  it('returns no posts for an invalid or unknown author id', async () => {
    const viewer = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    expect((await viewer.request<{ posts: unknown[] }>(POSTS, { id: 'not-an-id' })).posts).toEqual(
      []
    );
    const absent = new Types.ObjectId().toString();
    expect((await viewer.request<{ posts: unknown[] }>(POSTS, { id: absent })).posts).toEqual([]);
  });

  it('reports follow flags in publicUsersByIds', async () => {
    const targetId = await makeUser('Target');
    const followerId = await makeUser('Follower');
    const follower = server.client(signToken({ id: followerId, roles: ['USER'] }));
    await follower.request(FOLLOW, { id: targetId });
    const res = await follower.request<{ publicUsersByIds: any[] }>(
      gql`
        query Many($ids: [ID!]!) {
          publicUsersByIds(user_ids: $ids) {
            user_id
            is_following
          }
        }
      `,
      { ids: [targetId] }
    );
    expect(res.publicUsersByIds[0].is_following).toBe(true);
  });

  it('requires auth to change profile visibility', async () => {
    const anon = server.client();
    await expect(anon.request(SET_VISIBILITY, { v: 'PRIVATE' })).rejects.toThrow();
  });
});
