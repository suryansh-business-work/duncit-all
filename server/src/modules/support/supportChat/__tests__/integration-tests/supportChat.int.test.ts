import { Types } from 'mongoose';
import { supportChatService } from '../../supportChat.service';
import { SupportChatSessionModel } from '../../supportChat.model';

const userId = new Types.ObjectId().toString();

describe('supportChatService integration', () => {
  it('starts a single OPEN session and reuses it', async () => {
    const first = await supportChatService.start(userId);
    expect(first.status).toBe('OPEN');
    const second = await supportChatService.start(userId);
    expect(second.id).toBe(first.id);
    expect(await SupportChatSessionModel.countDocuments()).toBe(1);
  });

  it('starts with an opening message and exposes it via getMine + listMessages', async () => {
    const session = await supportChatService.start(userId, 'Hello support');
    const mine = await supportChatService.getMine(userId);
    expect(mine?.id).toBe(session.id);

    const messages = await supportChatService.listMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('Hello support');
    expect(messages[0].sender_role).toBe('USER');
  });

  it('tracks unread counters and assigns the agent on first agent reply', async () => {
    const session = await supportChatService.start(userId, 'hi');
    const agentId = new Types.ObjectId().toString();
    await supportChatService.sendMessage(agentId, true, { sessionId: session.id, text: 'Hi, how can I help?' });

    const afterAgent = await supportChatService.getMine(userId);
    expect(afterAgent?.agent_id).toBe(agentId);
    expect(afterAgent?.unread_for_user).toBe(1);

    const read = await supportChatService.markRead(session.id, false);
    expect(read.unread_for_user).toBe(0);
  });

  it('closes a session and re-opens it on a new user message', async () => {
    const session = await supportChatService.start(userId, 'hi');
    const closed = await supportChatService.close(session.id);
    expect(closed.status).toBe('CLOSED');

    await supportChatService.sendMessage(userId, false, { sessionId: session.id, text: 'still here' });
    const reopened = await supportChatService.getMine(userId);
    expect(reopened?.status).toBe('OPEN');
  });

  it('forbids posting to another user’s session and lists by status', async () => {
    const session = await supportChatService.start(userId, 'hi');
    await expect(
      supportChatService.sendMessage(new Types.ObjectId().toString(), false, {
        sessionId: session.id,
        text: 'intruder',
      })
    ).rejects.toThrow(/another user/i);

    const open = await supportChatService.listSessions('OPEN');
    expect(open).toHaveLength(1);
  });
});

describe('supportChat claim + system bubble', () => {
  it('claim assigns the agent and announces it as a SYSTEM message once', async () => {
    const uid = new Types.ObjectId().toString();
    const agentId = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'need help');

    const claimed = await supportChatService.claim(session.id, agentId);
    expect(claimed.agent_id).toBe(agentId);

    const messages = await supportChatService.listMessages(session.id);
    const system = messages.filter((m) => m.sender_role === 'SYSTEM');
    expect(system).toHaveLength(1);
    expect(system[0].text).toMatch(/picked up by/i);

    // Claiming again is a no-op (no duplicate bubble, agent unchanged).
    const again = await supportChatService.claim(session.id, new Types.ObjectId().toString());
    expect(again.agent_id).toBe(agentId);
    const after = await supportChatService.listMessages(session.id);
    expect(after.filter((m) => m.sender_role === 'SYSTEM')).toHaveLength(1);
  });

  it('first agent message auto-claims with the system bubble before the reply', async () => {
    const uid = new Types.ObjectId().toString();
    const agentId = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'hello');

    await supportChatService.sendMessage(agentId, true, { sessionId: session.id, text: 'On it!' });
    const messages = await supportChatService.listMessages(session.id);
    const roles = messages.map((m) => m.sender_role);
    expect(roles).toEqual(['USER', 'SYSTEM', 'AGENT']);
  });
});
