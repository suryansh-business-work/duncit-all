import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const SAVE = gql`
  mutation Save($draft_id: ID, $input: PodDraftInput!) {
    savePodDraft(draft_id: $draft_id, input: $input) {
      id
      pod_title
      step
      payload
    }
  }
`;
const LIST = gql`
  query {
    myPodDrafts {
      id
      pod_title
      step
    }
  }
`;
const DELETE = gql`
  mutation Del($draft_id: ID!) {
    deletePodDraft(draft_id: $draft_id)
  }
`;

describe('pod-draft e2e', () => {
  it('creates, updates, lists and deletes a host draft (owner-scoped)', async () => {
    const host = server.client(signToken({ roles: ['HOST'] }));

    const created = await host.request<{ savePodDraft: { id: string; step: number } }>(SAVE, {
      input: { payload: '{"pod_title":"Sunday Run"}', pod_title: 'Sunday Run', step: 1 },
    });
    const draftId = created.savePodDraft.id;
    expect(created.savePodDraft.step).toBe(1);

    const updated = await host.request<{ savePodDraft: { payload: string } }>(SAVE, {
      draft_id: draftId,
      input: { payload: '{"pod_title":"Sunday Run","pod_description":"Easy 5k"}', pod_title: 'Sunday Run', step: 3 },
    });
    expect(updated.savePodDraft.payload).toContain('Easy 5k');

    const list = await host.request<{ myPodDrafts: { id: string }[] }>(LIST);
    expect(list.myPodDrafts.map((d) => d.id)).toContain(draftId);

    const removed = await host.request<{ deletePodDraft: boolean }>(DELETE, { draft_id: draftId });
    expect(removed.deletePodDraft).toBe(true);
  });

  it('keeps drafts private to their owner', async () => {
    const owner = server.client(signToken({ roles: ['HOST'] }));
    const created = await owner.request<{ savePodDraft: { id: string } }>(SAVE, {
      input: { payload: '{}', pod_title: 'Private', step: 0 },
    });

    const stranger = server.client(signToken({ roles: ['HOST'] }));
    const list = await stranger.request<{ myPodDrafts: { id: string }[] }>(LIST);
    expect(list.myPodDrafts.map((d) => d.id)).not.toContain(created.savePodDraft.id);
  });

  it('requires authentication to save a draft', async () => {
    const anon = server.client();
    await expect(
      anon.request(SAVE, { input: { payload: '{}', pod_title: 'x', step: 0 } })
    ).rejects.toThrow();
  });

  it('rejects publishing without an approved host profile', async () => {
    const host = server.client(signToken({ roles: ['HOST'] }));
    const created = await host.request<{ savePodDraft: { id: string } }>(SAVE, {
      input: { payload: '{}', pod_title: 'To publish', step: 6 },
    });
    await expect(
      host.request(
        gql`
          mutation Publish($draft_id: ID!, $input: CreatePodInput!) {
            publishPodDraft(draft_id: $draft_id, input: $input) {
              id
            }
          }
        `,
        {
          draft_id: created.savePodDraft.id,
          input: {
            pod_title: 'To publish',
            club_id: '507f1f77bcf86cd799439011',
            pod_hosts_id: [],
            pod_description: 'A valid length description',
            pod_date_time: new Date(Date.now() + 86_400_000).toISOString(),
            pod_type: 'NATIVE_FREE',
          },
        }
      )
    ).rejects.toThrow();
  });
});
