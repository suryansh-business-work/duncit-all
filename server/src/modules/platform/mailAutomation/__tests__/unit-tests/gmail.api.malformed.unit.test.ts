/**
 * Mail that is not quite well formed, read through the Gmail slice with the
 * network faked at `outboundFetch`: a history record without an id, an HTML
 * script block whose closing tag never ends, a part that names no content type.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { getMessage, listAddedMessages } from '../../gmail.api';

const fetchMock = outboundFetch as jest.Mock;
const TOKEN = 'ya29.test-token';
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64url');
const message = (payload: unknown) => ok({ id: 'm1', threadId: 't1', payload });

beforeEach(() => fetchMock.mockReset());

describe('mail that is not quite well formed', () => {
  it('keeps walking a history page past a record that carries no id', async () => {
    fetchMock.mockResolvedValue(
      ok({
        historyId: '300',
        history: [
          { id: '210', messagesAdded: [{ message: { id: 'a', threadId: 'ta', labelIds: ['INBOX'] } }] },
          { messagesAdded: [{ message: { id: 'b', threadId: 'tb', labelIds: ['INBOX'] } }] },
        ],
        nextPageToken: 'more',
      }),
    );

    const result = await listAddedMessages(TOKEN, '200', 1);

    expect(result.messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(result).toMatchObject({ historyId: '210', truncated: true });
  });

  it('drops a script block whose closing tag never ends, and everything inside it', async () => {
    fetchMock.mockResolvedValue(
      message({ mimeType: 'text/html', body: { data: b64('<p>Before</p><script>x</script') } }),
    );

    const inbound = await getMessage(TOKEN, 'm1');

    expect(inbound.bodyText).toBe('Before');
  });

  it('ignores a part that names no content type, and reads the one that does', async () => {
    fetchMock.mockResolvedValue(
      message({
        mimeType: 'multipart/mixed',
        parts: [{ body: { data: b64('mystery') } }, { mimeType: 'text/plain', body: { data: b64('Plain words') } }],
      }),
    );

    expect((await getMessage(TOKEN, 'm1')).bodyText).toBe('Plain words');
  });
});
