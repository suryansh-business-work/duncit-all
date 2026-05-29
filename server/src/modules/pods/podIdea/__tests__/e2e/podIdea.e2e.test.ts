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
  mutation Create($input: CreatePodIdeaInput!) {
    createPodIdea(input: $input) {
      id
      title
      status
      likes_count
    }
  }
`;

describe('podIdea e2e', () => {
  it('lets a user post an idea, list it and like it', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['USER'] }));
    const created = await user.request<{ createPodIdea: { id: string; status: string } }>(CREATE, {
      input: { title: 'Beach cleanup pod', description: 'Sunday morning' },
    });
    expect(created.createPodIdea.status).toBe('PENDING');

    const list = await user.request<{ podIdeas: unknown[] }>(gql`query { podIdeas { id title } }`);
    expect(list.podIdeas).toHaveLength(1);

    const liked = await user.request<{ togglePodIdeaLike: { likes_count: number } }>(
      gql`
        mutation ($id: ID!) {
          togglePodIdeaLike(pod_idea_doc_id: $id) {
            likes_count
          }
        }
      `,
      { id: created.createPodIdea.id }
    );
    expect(liked.togglePodIdeaLike.likes_count).toBe(1);
  });

  it('rejects posting an idea without authentication', async () => {
    const anon = server.client();
    await expect(
      anon.request(CREATE, { input: { title: 'x', description: 'y' } })
    ).rejects.toThrow();
  });
});
