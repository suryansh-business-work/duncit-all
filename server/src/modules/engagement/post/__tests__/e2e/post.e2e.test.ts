import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      caption
    }
  }
`;

describe('post e2e', () => {
  it('lets a user create a post and list it', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const created = await user.request<{ createPost: { id: string } }>(CREATE, {
      input: { image_url: 'https://img/x.jpg', caption: 'Hi' },
    });
    expect(created.createPost.id).toBeTruthy();

    const list = await user.request<{ posts: unknown[] }>(gql`query { posts { id caption } }`);
    expect(list.posts).toHaveLength(1);
  });

  it('requires authentication to create a post', async () => {
    const anon = server.client();
    await expect(anon.request(CREATE, { input: { image_url: 'https://img/x.jpg' } })).rejects.toThrow();
  });
});
