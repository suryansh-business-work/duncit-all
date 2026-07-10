const sendHtmlEmailMock = jest.fn().mockResolvedValue({ messageId: 'test' });
jest.mock('@services/email/email.service', () => ({
  sendHtmlEmail: (...args: unknown[]) => sendHtmlEmailMock(...args),
}));

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

    const open = await supportChatService.listSessions({ status: 'OPEN' });
    expect(open.items).toHaveLength(1);
    expect(open.total).toBe(1);
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
    expect(system[0].text).toMatch(/will be assisting you now/i);

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

describe('supportChat resolve / reopen / feedback', () => {
  it('lets the user resolve a chat and re-open it, each announced as a SYSTEM bubble', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'help me');

    const resolved = await supportChatService.resolve(session.id, 'the user');
    expect(resolved.status).toBe('CLOSED');

    const reopened = await supportChatService.reopen(session.id, 'the user');
    expect(reopened.status).toBe('OPEN');

    const messages = await supportChatService.listMessages(session.id);
    const systemTexts = messages.filter((m) => m.sender_role === 'SYSTEM').map((m) => m.text);
    expect(systemTexts).toEqual([
      'Chat marked resolved by the user.',
      'Chat re-opened by the user.',
    ]);
  });

  it('getMine returns the latest thread even after it is resolved (Bug 12)', async () => {
    const uid = new Types.ObjectId().toString();
    const s = await supportChatService.start(uid, 'hi');
    await supportChatService.resolve(s.id, 'the user');
    const mine = await supportChatService.getMine(uid);
    expect(mine?.id).toBe(s.id);
    expect(mine?.status).toBe('CLOSED');
  });

  it('stores satisfaction feedback on a resolved chat and enforces the guards', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'thanks');

    // (a) bad rating is rejected before any resolution check.
    await expect(
      supportChatService.submitFeedback(session.id, uid, { rating: 9 })
    ).rejects.toThrow(/1-5/);
    // (b) feedback is blocked while the chat is still open.
    await expect(
      supportChatService.submitFeedback(session.id, uid, { rating: 4 })
    ).rejects.toThrow(/resolved before feedback/i);
    // (c) another user can never leave feedback.
    await expect(
      supportChatService.submitFeedback(session.id, new Types.ObjectId().toString(), { rating: 4 })
    ).rejects.toThrow(/not your chat/i);

    await supportChatService.resolve(session.id, 'the user');
    const fed = await supportChatService.submitFeedback(session.id, uid, { rating: 5, comment: 'great' });
    expect(fed.rating).toBe(5);
    expect(fed.feedback_comment).toBe('great');

    // (d) one-time: a second submission is rejected.
    await expect(
      supportChatService.submitFeedback(session.id, uid, { rating: 3 })
    ).rejects.toThrow(/already submitted/i);
  });

  it('records read timestamps for the seen/blue-tick state', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'hi');
    const agentId = new Types.ObjectId().toString();
    await supportChatService.sendMessage(agentId, true, { sessionId: session.id, text: 'hello' });

    const afterUserRead = await supportChatService.markRead(session.id, false);
    expect(afterUserRead.user_last_read_at).toBeTruthy();

    const afterAgentRead = await supportChatService.markRead(session.id, true);
    expect(afterAgentRead.agent_last_read_at).toBeTruthy();
  });
});

describe('supportChat transcript', () => {
  it('builds a plain-text transcript with the CH ticket number', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'Where is my refund?');

    const t = await supportChatService.transcript(session.id);
    expect(t.filename).toMatch(/^support-CH-[0-9A-F]{6}\.txt$/);
    expect(t.text).toContain('Where is my refund?');
    expect(Buffer.from(t.content_base64, 'base64').toString('utf8')).toBe(t.text);
  });

  it('builds a .docx transcript (valid zip/Office package) on request', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'Need the docx');

    const t = await supportChatService.transcript(session.id, 'DOCX');
    expect(t.filename).toMatch(/^support-CH-[0-9A-F]{6}\.docx$/);
    // .txt rendering is still returned for previews.
    expect(t.text).toContain('Need the docx');
    // A .docx is a zip — its bytes start with the "PK" local-file signature.
    const bytes = Buffer.from(t.content_base64, 'base64');
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('emails the transcript (.docx by default) to a valid address only', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'email me please');

    const ok = await supportChatService.emailTranscript(session.id, 'me@example.com');
    expect(ok).toBe(true);
    expect(sendHtmlEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendHtmlEmailMock.mock.calls[0][0];
    expect(arg.to).toBe('me@example.com');
    expect(arg.attachments[0].filename).toMatch(/^support-CH-[0-9A-F]{6}\.docx$/);
    expect(Buffer.isBuffer(arg.attachments[0].content)).toBe(true);

    await expect(supportChatService.emailTranscript(session.id, 'not-an-email')).rejects.toThrow(
      /valid email/i
    );
  });

  it('emails a .txt transcript when the TXT format is requested', async () => {
    const uid = new Types.ObjectId().toString();
    const session = await supportChatService.start(uid, 'txt please');

    await supportChatService.emailTranscript(session.id, 'me@example.com', 'TXT');
    const arg = sendHtmlEmailMock.mock.calls.at(-1)![0];
    expect(arg.attachments[0].filename).toMatch(/\.txt$/);
  });
});
