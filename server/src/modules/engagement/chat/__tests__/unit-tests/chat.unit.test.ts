import { chatResolvers } from '../../chat.resolver';
import { makeContext } from '@test/harness';

describe('chat unit', () => {
  it('myChatRooms requires authentication', async () => {
    await expect(
      (async () => (chatResolvers.Query as any).myChatRooms({}, {}, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('sendPodMessage requires authentication', async () => {
    await expect(
      (async () => (chatResolvers.Mutation as any).sendPodMessage({}, { pod_doc_id: 'x', text: 'hi' }, makeContext(null)))()
    ).rejects.toThrow();
  });
});
