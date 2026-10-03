/**
 * The Gmail REST slice behind Mail Automation, with the network faked at
 * `outboundFetch`.
 *
 * An inbound email is written by a stranger and bounded by nothing, so most of
 * what is pinned here is the edge: the history walk that must never skip or
 * re-read mail, the decoding of encoded headers and charsets, the body picked
 * out of a multipart tree, the automated-mail detection that keeps two robots
 * from answering each other, and the threaded reply that cannot be made to
 * carry headers of the sender's choosing.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import {
  buildReplyMime,
  decodeEncodedWords,
  getMessage,
  getProfile,
  HistoryExpiredError,
  listAddedMessages,
  parseFromHeader,
  sendReply,
  stripQuotedReply,
  type ReplyParams,
} from '../../gmail.api';

const fetchMock = outboundFetch as jest.Mock;
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN = 'ya29.test-token';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
const fail = (status: number, text: string) => ({
  ok: false,
  status,
  json: async () => ({}),
  text: async () => text,
});

const b64 = (text: string, encoding: BufferEncoding = 'utf8') =>
  Buffer.from(text, encoding).toString('base64url');

beforeEach(() => {
  fetchMock.mockReset();
});

describe('a Gmail request', () => {
  it('reads the profile with the bearer token', async () => {
    fetchMock.mockResolvedValue(ok({ emailAddress: 'support@example.com', historyId: '900' }));

    await expect(getProfile(TOKEN)).resolves.toEqual({ emailAddress: 'support@example.com', historyId: '900' });
    const [service, url, init] = fetchMock.mock.calls[0];
    expect(service).toBe('Gmail');
    expect(url).toBe(`${API}/profile`);
    expect(init.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' });
  });

  it('surfaces Google’s own sentence rather than its JSON envelope', async () => {
    fetchMock.mockResolvedValue(
      fail(403, JSON.stringify({ error: { message: 'Gmail API has not been used in project 1 before' } }))
    );

    await expect(getProfile(TOKEN)).rejects.toThrow('Gmail API 403: Gmail API has not been used in project 1 before');
  });

  it('reads an error given as a bare string', async () => {
    fetchMock.mockResolvedValue(fail(400, JSON.stringify({ error: 'invalid_grant' })));

    await expect(getProfile(TOKEN)).rejects.toThrow('Gmail API 400: invalid_grant');
  });

  it('falls back to the raw text for a body that is not JSON, or JSON without a message', async () => {
    fetchMock.mockResolvedValueOnce(fail(502, '<html>Bad Gateway</html>'));
    await expect(getProfile(TOKEN)).rejects.toThrow('Gmail API 502: <html>Bad Gateway</html>');

    fetchMock.mockResolvedValueOnce(fail(500, '{"error":{}}'));
    await expect(getProfile(TOKEN)).rejects.toThrow('Gmail API 500: {"error":{}}');
  });

  it('reports an unreadable error body as empty rather than throwing a second error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('stream reset');
      },
    });

    await expect(getProfile(TOKEN)).rejects.toThrow(/^Gmail API 500: $/);
  });
});

describe('listAddedMessages', () => {
  const added = (id: string, labels = ['INBOX']) => ({ message: { id, threadId: `t-${id}`, labelIds: labels } });

  it('raises HistoryExpiredError for a 404 on the history cursor', async () => {
    fetchMock.mockResolvedValue(fail(404, 'Requested entity was not found.'));

    const error = await listAddedMessages(TOKEN, '100').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HistoryExpiredError);
    expect((error as Error).message).toBe('Gmail history cursor has expired');
  });

  it('keeps INBOX arrivals only, once each, and stores the mailbox’s new cursor', async () => {
    fetchMock.mockResolvedValue(
      ok({
        historyId: '250',
        history: [
          { id: '201', messagesAdded: [added('m1'), added('sent-1', ['SENT'])] },
          { id: '202', messagesAdded: [added('m1'), added('m2'), { message: { threadId: 'no-id' } }, {}] },
          { id: '203' },
        ],
      })
    );

    const result = await listAddedMessages(TOKEN, '200');

    expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(result).toMatchObject({ historyId: '250', truncated: false });
    const url = new URL(fetchMock.mock.calls[0][1]);
    expect(url.pathname).toBe('/gmail/v1/users/me/history');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startHistoryId: '200',
      historyTypes: 'messageAdded',
      maxResults: '100',
    });
  });

  it('follows page tokens to the end', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ historyId: '300', history: [{ id: '210', messagesAdded: [added('a')] }], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(ok({ historyId: '301', history: [{ id: '220', messagesAdded: [added('b')] }] }));

    const result = await listAddedMessages(TOKEN, '200');

    expect(result).toEqual({
      messages: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' })],
      historyId: '301',
      truncated: false,
    });
    expect(new URL(fetchMock.mock.calls[1][1]).searchParams.get('pageToken')).toBe('p2');
  });

  it('keeps the old cursor when Gmail reports nothing new at all', async () => {
    fetchMock.mockResolvedValue(ok({}));

    await expect(listAddedMessages(TOKEN, '200')).resolves.toEqual({
      messages: [],
      historyId: '200',
      truncated: false,
    });
  });

  it('stops at the page cap on the last record READ, not the mailbox end', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ historyId: '999', history: [{ id: '210', messagesAdded: [added('a')] }], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(ok({ historyId: '999', history: [{ id: '220' }], nextPageToken: 'p3' }));

    const result = await listAddedMessages(TOKEN, '200', 2);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ historyId: '220', truncated: true });
  });

  it('resumes from the start cursor when a capped walk read no record ids', async () => {
    fetchMock.mockResolvedValue(ok({ historyId: '999', history: [], nextPageToken: 'more' }));

    const result = await listAddedMessages(TOKEN, '200', 1);

    expect(result).toEqual({ messages: [], historyId: '200', truncated: true });
  });
});

describe('decodeEncodedWords', () => {
  it('leaves a plain header alone', () => {
    expect(decodeEncodedWords('Booking question')).toBe('Booking question');
  });

  it('decodes base64 and Q words, joining adjacent ones', () => {
    const b = Buffer.from('Café ', 'utf8').toString('base64');
    expect(decodeEncodedWords(`=?UTF-8?B?${b}?= =?utf-8?Q?na_m=C3=A9?=`)).toBe('Café na mé');
  });

  it('reads a Latin-1 word byte for byte', () => {
    expect(decodeEncodedWords('=?ISO-8859-1?Q?caf=E9?=')).toBe('café');
    expect(decodeEncodedWords('=?us-ascii?Q?plain?=')).toBe('plain');
  });

  it('keeps a word whose payload cannot be decoded as it arrived', () => {
    const spy = jest.spyOn(Buffer, 'from').mockImplementationOnce(() => {
      throw new Error('bad payload');
    });
    try {
      expect(decodeEncodedWords('Hi =?UTF-8?B?QUJD?=')).toBe('Hi =?UTF-8?B?QUJD?=');
      expect(spy).toHaveBeenCalledWith('QUJD', 'base64');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('parseFromHeader', () => {
  it.each([
    ['"Asha Rao" <Asha@Example.com>', { email: 'asha@example.com', name: 'Asha Rao' }],
    ['asha@example.com', { email: 'asha@example.com', name: '' }],
    ['Asha <asha@example.com', { email: 'asha <asha@example.com', name: '' }],
    ['=?UTF-8?Q?Ren=C3=A9?= <rene@example.com>', { email: 'rene@example.com', name: 'René' }],
  ])('%s', (raw, expected) => {
    expect(parseFromHeader(raw)).toEqual(expected);
  });
});

describe('stripQuotedReply', () => {
  it.each([
    ['Thanks!\n> earlier message', 'Thanks!'],
    ['Thanks!\r\nOn Mon, 1 Jan 2026 Asha wrote:\nold', 'Thanks!'],
    ['Thanks!\n----- Original Message -----\nold', 'Thanks!'],
    ['Thanks!\n--\nAsha, Duncit', 'Thanks!'],
    ['No quotes here', 'No quotes here'],
  ])('cuts %j', (text, expected) => {
    expect(stripQuotedReply(text)).toBe(expected);
  });

  it('keeps a message that would otherwise be stripped to nothing', () => {
    expect(stripQuotedReply('> only a quote\n')).toBe('> only a quote');
  });
});

describe('getMessage', () => {
  const header = (name: string, value: string) => ({ name, value });
  const message = (payload: unknown) => ok({ id: 'm1', threadId: 't1', payload });

  it('reduces a message to what a ticket and a reply need', async () => {
    fetchMock.mockResolvedValue(
      message({
        mimeType: 'multipart/alternative',
        headers: [
          header('From', '"Asha Rao" <asha@example.com>'),
          header('Subject', '  =?UTF-8?B?' + Buffer.from('Refund – pod', 'utf8').toString('base64') + '?=  '),
          header('Message-ID', '<abc@mail.example.com>'),
          header('References', '<root@mail.example.com>'),
        ],
        parts: [
          { mimeType: 'text/plain', body: { data: b64('Where is my refund?\n> quoted') } },
          { mimeType: 'text/html', body: { data: b64('<p>ignored</p>') } },
        ],
      })
    );

    const inbound = await getMessage(TOKEN, 'm1');

    expect(fetchMock.mock.calls[0][1]).toBe(`${API}/messages/m1?format=full`);
    expect(inbound).toEqual({
      id: 'm1',
      threadId: 't1',
      fromEmail: 'asha@example.com',
      fromName: 'Asha Rao',
      subject: 'Refund – pod',
      bodyText: 'Where is my refund?',
      messageIdHeader: '<abc@mail.example.com>',
      referencesHeader: '<root@mail.example.com>',
      isAutomated: false,
    });
  });

  it('takes the FIRST plain part in document order, skipping attachments', async () => {
    fetchMock.mockResolvedValue(
      message({
        mimeType: 'multipart/mixed',
        parts: [
          { mimeType: 'text/plain', filename: 'notes.txt', body: { data: b64('attachment text') } },
          {
            mimeType: 'multipart/alternative',
            parts: [{ mimeType: 'text/plain', body: { data: b64('what they wrote') } }],
          },
          { mimeType: 'text/plain', body: { data: b64('forwarded footer') } },
        ],
      })
    );

    expect((await getMessage(TOKEN, 'm1')).bodyText).toBe('what they wrote');
  });

  it('falls back to the HTML part as text, without scripts or styles', async () => {
    const html =
      '<html><style>p{color:red}</style><script>alert(1)</script>' +
      '<p>Hello&nbsp;there</p><p>A &amp; B &lt;3&gt;<br/>next</p></html>';
    fetchMock.mockResolvedValue(message({ mimeType: 'text/html', body: { data: b64(html) } }));

    const inbound = await getMessage(TOKEN, 'm1');

    expect(inbound.bodyText).toContain('Hello there');
    expect(inbound.bodyText).toContain('A & B <3>');
    expect(inbound.bodyText).toContain('next');
    expect(inbound.bodyText).not.toContain('alert');
    expect(inbound.bodyText).not.toContain('color');
  });

  it('drops everything after an unterminated script block', async () => {
    fetchMock.mockResolvedValue(
      message({ mimeType: 'text/html', body: { data: b64('<p>Visible</p><script>never closed') } })
    );

    expect((await getMessage(TOKEN, 'm1')).bodyText).toBe('Visible');
  });

  it('decodes a part in the charset its own Content-Type names', async () => {
    fetchMock.mockResolvedValue(
      message({
        mimeType: 'text/plain',
        headers: [header('Content-Type', 'text/plain; charset="ISO-8859-1"')],
        body: { data: b64('café', 'latin1') },
      })
    );

    expect((await getMessage(TOKEN, 'm1')).bodyText).toBe('café');
  });

  it('bounds a stranger’s subject, name and body at the edge', async () => {
    fetchMock.mockResolvedValue(
      message({
        mimeType: 'text/plain',
        headers: [header('From', `"${'N'.repeat(300)}" <n@example.com>`), header('Subject', 'S'.repeat(500))],
        body: { data: b64('B'.repeat(9000)) },
      })
    );

    const inbound = await getMessage(TOKEN, 'm1');

    expect(inbound.fromName).toHaveLength(120);
    expect(inbound.subject).toHaveLength(200);
    expect(inbound.bodyText).toHaveLength(8000);
  });

  it('reads a message with no payload as empty', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'm1', threadId: 't1' }));

    await expect(getMessage(TOKEN, 'm1')).resolves.toMatchObject({
      fromEmail: '',
      subject: '',
      bodyText: '',
      isAutomated: false,
    });
  });

  it.each([
    ['Auto-Submitted', 'auto-replied', true],
    ['Auto-Submitted', 'no', false],
    ['Precedence', 'bulk', true],
    ['Precedence', 'List', true],
    ['Precedence', 'first-class', false],
    ['List-Id', '<news.example.com>', true],
    ['X-Autoreply', 'yes', true],
  ])('reads %s: %s as automated=%s', async (name, value, expected) => {
    fetchMock.mockResolvedValue(message({ mimeType: 'text/plain', headers: [header(name, value)] }));

    expect((await getMessage(TOKEN, 'm1')).isAutomated).toBe(expected);
  });
});

describe('buildReplyMime', () => {
  const params: ReplyParams = {
    fromEmail: 'support@example.com',
    fromName: 'Duncit Support',
    toEmail: 'asha@example.com',
    subject: 'Refund',
    bodyText: 'We have logged your message.',
    threadId: 't1',
    inReplyTo: '<abc@mail.example.com>',
    references: '<root@mail.example.com>',
  };

  const split = (mime: string) => {
    const [head, body] = mime.split('\r\n\r\n');
    return { headers: head.split('\r\n'), body: Buffer.from(body, 'base64').toString('utf8') };
  };

  it('threads the reply and marks it as auto-submitted', () => {
    const { headers, body } = split(buildReplyMime(params));

    expect(headers).toEqual([
      'From: Duncit Support <support@example.com>',
      'To: asha@example.com',
      'Subject: Re: Refund',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      'Auto-Submitted: auto-replied',
      'In-Reply-To: <abc@mail.example.com>',
      'References: <root@mail.example.com> <abc@mail.example.com>',
    ]);
    expect(body).toBe('We have logged your message.');
  });

  it('does not stack "Re:" and leaves a human reply unmarked', () => {
    const { headers } = split(buildReplyMime({ ...params, subject: 'RE: Refund', autoReply: false }));

    expect(headers).toContain('Subject: RE: Refund');
    expect(headers.some((line) => line.startsWith('Auto-Submitted'))).toBe(false);
  });

  it('omits threading headers it has nothing for', () => {
    const { headers } = split(buildReplyMime({ ...params, inReplyTo: '', references: '' }));

    expect(headers.some((line) => line.startsWith('In-Reply-To'))).toBe(false);
    expect(headers.some((line) => line.startsWith('References'))).toBe(false);
  });

  it('encodes a non-ASCII name and subject, and strips CR/LF out of the address', () => {
    const { headers } = split(
      buildReplyMime({ ...params, fromName: 'Équipe', subject: 'Remboursé', toEmail: 'a@example.com\r\nBcc: x@example.com' })
    );

    expect(headers[0]).toBe(`From: =?UTF-8?B?${Buffer.from('Équipe').toString('base64')}?= <support@example.com>`);
    expect(headers[1]).toBe('To: a@example.comBcc: x@example.com');
    expect(headers[2]).toBe(`Subject: =?UTF-8?B?${Buffer.from('Re: Remboursé').toString('base64')}?=`);
  });
});

describe('sendReply', () => {
  it('POSTs the MIME into the thread and returns Gmail’s id', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'sent-1' }));
    const params: ReplyParams = {
      fromEmail: 'support@example.com',
      fromName: 'Duncit',
      toEmail: 'asha@example.com',
      subject: 'Hi',
      bodyText: 'Hello',
      threadId: 't9',
      inReplyTo: '',
      references: '',
    };

    await expect(sendReply(TOKEN, params)).resolves.toBe('sent-1');
    const [, url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/messages/send`);
    expect(init.method).toBe('POST');
    const sent = JSON.parse(init.body);
    expect(sent.threadId).toBe('t9');
    expect(Buffer.from(sent.raw, 'base64url').toString('utf8')).toBe(buildReplyMime(params));
  });
});
