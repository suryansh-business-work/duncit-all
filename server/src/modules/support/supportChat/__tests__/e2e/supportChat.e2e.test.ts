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

const START = gql`
  mutation Start($text: String) {
    startSupportChat(text: $text) {
      id
      status
    }
  }
`;
const SEND = gql`
  mutation Send($session_id: ID!, $text: String) {
    sendSupportChatMessage(session_id: $session_id, text: $text) {
      id
      text
      sender_role
    }
  }
`;
const MESSAGES = gql`
  query Messages($session_id: ID!) {
    supportChatMessages(session_id: $session_id) {
      id
      text
    }
  }
`;

describe('supportChat e2e', () => {
  it('lets a user open a chat, send a message and read it back', async () => {
    const userId = new Types.ObjectId().toString();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));

    const started = await user.request<{ startSupportChat: { id: string; status: string } }>(START, {
      text: 'I need help',
    });
    expect(started.startSupportChat.status).toBe('OPEN');
    const sessionId = started.startSupportChat.id;

    await user.request(SEND, { session_id: sessionId, text: 'Second message' });

    const msgs = await user.request<{ supportChatMessages: Array<{ text: string }> }>(MESSAGES, {
      session_id: sessionId,
    });
    expect(msgs.supportChatMessages.map((m) => m.text)).toEqual(['I need help', 'Second message']);
  });

  it('lets an agent list sessions but forbids a regular user', async () => {
    const userId = new Types.ObjectId().toString();
    await server.client(signToken({ id: userId, roles: ['USER'] })).request(START, { text: 'hi' });

    const agent = server.client(signToken({ roles: ['SUPPORT_USER'] }));
    const sessions = await agent.request<{
      supportChatSessions: { items: Array<{ id: string }>; total: number };
    }>(gql`
      query {
        supportChatSessions {
          items {
            id
            status
          }
          total
          page
          page_size
        }
      }
    `);
    expect(sessions.supportChatSessions.items.length).toBeGreaterThanOrEqual(1);
    expect(sessions.supportChatSessions.total).toBeGreaterThanOrEqual(1);

    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { supportChatSessions { total } }`)
    ).rejects.toThrow();
  });

  it('exports a chat transcript in the requested format and gates feedback on resolution', async () => {
    const userId = new Types.ObjectId().toString();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const started = await user.request<{ startSupportChat: { id: string } }>(START, {
      text: 'export this chat',
    });
    const id = started.startSupportChat.id;

    const docx = await user.request<{ supportChatTranscript: { filename: string } }>(
      gql`query ($id: ID!) { supportChatTranscript(session_id: $id, format: DOCX) { filename } }`,
      { id }
    );
    expect(docx.supportChatTranscript.filename).toMatch(/\.docx$/);

    // Feedback is rejected before the chat is resolved.
    await expect(
      user.request(
        gql`mutation ($id: ID!) { submitSupportChatFeedback(session_id: $id, rating: 5) { rating } }`,
        { id }
      )
    ).rejects.toThrow(/resolved before feedback/i);

    await user.request(gql`mutation ($id: ID!) { resolveSupportChat(session_id: $id) { status } }`, { id });
    const fed = await user.request<{ submitSupportChatFeedback: { rating: number } }>(
      gql`mutation ($id: ID!) { submitSupportChatFeedback(session_id: $id, rating: 4) { rating } }`,
      { id }
    );
    expect(fed.submitSupportChatFeedback.rating).toBe(4);
  });
});
