import { Types } from 'mongoose';
import { supportChatService } from '../../supportChat.service';
import { supportChatResolvers } from '../../supportChat.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('supportChat unit', () => {
  it('sendMessage rejects an invalid session id', async () => {
    await expect(
      supportChatService.sendMessage(uid, false, { sessionId: 'not-an-id', text: 'hi' })
    ).rejects.toThrow(/invalid session_id/i);
  });

  it('sendMessage rejects an empty message with no attachments', async () => {
    await expect(
      supportChatService.sendMessage(uid, false, {
        sessionId: new Types.ObjectId().toString(),
        text: '   ',
      })
    ).rejects.toThrow(/text or attachment required/i);
  });

  it('supportChatSessions is gated to support roles', () => {
    expect(() =>
      (supportChatResolvers.Query as any).supportChatSessions({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });

  it('startSupportChat requires authentication', () => {
    expect(() =>
      (supportChatResolvers.Mutation as any).startSupportChat({}, {}, makeContext(null))
    ).toThrow(/not authenticated/i);
  });
});
