const mockAi = {
  isOpenAiConfigured: jest.fn(),
  aiSupportReply: jest.fn(),
};
jest.mock('../../supportChat.ai', () => ({
  isOpenAiConfigured: (...a: unknown[]) => mockAi.isOpenAiConfigured(...a),
  aiSupportReply: (...a: unknown[]) => mockAi.aiSupportReply(...a),
}));

import { Types } from 'mongoose';
import { supportChatService } from '../../supportChat.service';
import { SupportChatSessionModel, SupportChatMessageModel } from '../../supportChat.model';

async function seedUserChat(text: string) {
  const uid = new Types.ObjectId();
  const session = await SupportChatSessionModel.create({
    user_id: uid,
    status: 'OPEN',
    ai_active: true,
    last_message_at: new Date(),
  });
  await SupportChatMessageModel.create({
    session_id: session._id,
    sender_id: uid,
    sender_role: 'USER',
    text,
  });
  return String(session._id);
}

beforeEach(() => {
  mockAi.isOpenAiConfigured.mockResolvedValue(true);
  mockAi.aiSupportReply.mockReset();
});

describe('supportChat AI assistant', () => {
  it('greets the user with an AI bubble when OpenAI is configured', async () => {
    const uid = new Types.ObjectId().toString();
    const s = await supportChatService.start(uid);
    expect(s.ai_active).toBe(true);
    const msgs = await supportChatService.listMessages(s.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].is_ai).toBe(true);
    expect(msgs[0].sender_role).toBe('AGENT');
  });

  it('posts the AI reply for a question it can handle', async () => {
    mockAi.aiSupportReply.mockResolvedValue({
      reply: 'You can join a pod from the Explore tab.',
      handoff: false,
    });
    const sessionId = await seedUserChat('how do I join a pod?');

    await supportChatService.generateAiReply(sessionId);

    const msgs = await supportChatService.listMessages(sessionId);
    const ai = msgs.filter((m) => m.is_ai);
    expect(ai).toHaveLength(1);
    expect(ai[0].text).toMatch(/explore tab/i);
    const fresh = await SupportChatSessionModel.findById(sessionId);
    expect(fresh!.ai_active).toBe(true);
    expect(fresh!.handed_off).toBe(false);
  });

  it('hands off to a human when the query is out of scope', async () => {
    mockAi.aiSupportReply.mockResolvedValue({ reply: '', handoff: true });
    const sessionId = await seedUserChat('refund my payment now');

    await supportChatService.generateAiReply(sessionId);

    const msgs = await supportChatService.listMessages(sessionId);
    const system = msgs.filter((m) => m.sender_role === 'SYSTEM');
    expect(system).toHaveLength(1);
    expect(system[0].text).toMatch(/support executive/i);
    const fresh = await SupportChatSessionModel.findById(sessionId);
    expect(fresh!.ai_active).toBe(false);
    expect(fresh!.handed_off).toBe(true);
    expect(fresh!.unread_for_agent).toBeGreaterThanOrEqual(1);
  });

  it('does nothing once a human agent is assigned', async () => {
    const uid = new Types.ObjectId();
    const session = await SupportChatSessionModel.create({
      user_id: uid,
      agent_id: new Types.ObjectId(),
      status: 'OPEN',
      ai_active: true,
      last_message_at: new Date(),
    });
    await SupportChatMessageModel.create({
      session_id: session._id,
      sender_id: uid,
      sender_role: 'USER',
      text: 'hi',
    });
    await supportChatService.generateAiReply(String(session._id));
    expect(mockAi.aiSupportReply).not.toHaveBeenCalled();
  });
});
