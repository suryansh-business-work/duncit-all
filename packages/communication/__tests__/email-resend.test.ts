import { describe, expect, it, vi } from 'vitest';
import {
  EmailConfigurationError,
  EmailProviderError,
  EmailRateLimitError,
  ResendProvider,
  createCommunication,
} from '../src/index';
import type { PreparedEmail } from '../src/index';

/** A fetch that answers whatever the test says, and records what it was given. */
function stubFetch(
  answers: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>,
) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const queue = [...answers];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      headers: new Headers(next.headers ?? {}),
      json: async () => next.body ?? {},
    } as unknown as Response;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const ok = { status: 200, body: { id: 're_123' } };

const email: PreparedEmail = {
  category: 'transactional',
  from: 'Duncit <noreply@duncit.com>',
  to: ['user@example.com'],
  cc: [],
  bcc: [],
  subject: 'Booking Confirmed',
  html: '<p>hi</p>',
  text: 'hi',
  attachments: [],
  tags: [],
  metadata: {},
  headers: {},
  idempotencyKey: 'dc-abc',
};

describe('ResendProvider', () => {
  it('maps the message into Resend’s field names', async () => {
    const { impl, calls } = stubFetch([ok]);

    const result = await new ResendProvider({ apiKey: 'key_1', fetchImpl: impl }).send({
      ...email,
      cc: ['cc@x.com'],
      bcc: ['bcc@x.com'],
      replyTo: 'support@duncit.com',
      headers: { 'X-Trace': 'abc' },
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(body).toMatchObject({
      from: 'Duncit <noreply@duncit.com>',
      to: ['user@example.com'],
      cc: ['cc@x.com'],
      bcc: ['bcc@x.com'],
      subject: 'Booking Confirmed',
      html: '<p>hi</p>',
      text: 'hi',
      reply_to: 'support@duncit.com',
      headers: { 'X-Trace': 'abc' },
    });
    expect(result).toEqual({
      messageId: 're_123',
      provider: 'resend',
      accepted: ['user@example.com', 'cc@x.com', 'bcc@x.com'],
      raw: { id: 're_123' },
    });
  });

  it('authorises with a bearer token and a send-once key', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new ResendProvider({ apiKey: 'key_1', fetchImpl: impl }).send(email);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer key_1');
    // Without this, the transport's own retry could deliver a receipt twice.
    expect(headers['Idempotency-Key']).toBe('dc-abc');
  });

  it('omits the fields Resend should not see at all', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new ResendProvider({ apiKey: 'k', fetchImpl: impl }).send(email);
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).not.toHaveProperty('cc');
    expect(body).not.toHaveProperty('bcc');
    expect(body).not.toHaveProperty('reply_to');
    expect(body).not.toHaveProperty('headers');
    expect(body).not.toHaveProperty('attachments');
  });

  it('always tags the category, and sanitises tags Resend would reject', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new ResendProvider({ apiKey: 'k', fetchImpl: impl }).send({
      ...email,
      category: 'marketing',
      tags: ['summer sale'],
      metadata: { 'pod id': 'POD 1021' },
    });
    expect(JSON.parse(String(calls[0].init.body)).tags).toEqual([
      { name: 'category', value: 'marketing' },
      { name: 'summer_sale', value: '1' },
      { name: 'pod_id', value: 'POD_1021' },
    ]);
  });

  it('base64-encodes attachments, with and without a content type', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new ResendProvider({ apiKey: 'k', fetchImpl: impl }).send({
      ...email,
      attachments: [
        { filename: 'ticket.pdf', content: 'hi', contentType: 'application/pdf' },
        { filename: 'note.txt', content: new Uint8Array([104, 105]) },
      ],
    });
    expect(JSON.parse(String(calls[0].init.body)).attachments).toEqual([
      { filename: 'ticket.pdf', content: 'aGk=', content_type: 'application/pdf' },
      { filename: 'note.txt', content: 'aGk=' },
    ]);
  });

  it('reports a null message id rather than inventing one', async () => {
    const { impl } = stubFetch([{ status: 200, body: {} }]);
    const result = await new ResendProvider({ apiKey: 'k', fetchImpl: impl }).send(email);
    expect(result.messageId).toBeNull();
  });

  it('marks a rejected key NOT retryable — repeating it changes nothing', async () => {
    const { impl } = stubFetch([{ status: 401, body: { message: 'API key is invalid' } }]);
    try {
      await new ResendProvider({ apiKey: 'k', fetchImpl: impl, retry: { attempts: 1 } }).send(
        email,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      const failure = error as EmailProviderError;
      expect(failure).toBeInstanceOf(EmailProviderError);
      expect(failure.status).toBe(401);
      expect(failure.retryable).toBe(false);
      expect(failure.message).toMatch(/API key is invalid/);
    }
  });

  it('marks a 5xx retryable and falls back to the status when there is no reason', async () => {
    const { impl } = stubFetch([{ status: 503, body: {} }]);
    try {
      await new ResendProvider({ apiKey: 'k', fetchImpl: impl, retry: { attempts: 1 } }).send(
        email,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as EmailProviderError).retryable).toBe(true);
      expect((error as Error).message).toMatch(/HTTP 503/);
    }
  });

  it('raises a rate-limit error carrying the wait the provider stated', async () => {
    const { impl } = stubFetch([
      { status: 429, body: { message: 'Too many requests' }, headers: { 'Retry-After': '30' } },
    ]);
    try {
      await new ResendProvider({ apiKey: 'k', fetchImpl: impl, retry: { attempts: 1 } }).send(
        email,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      const failure = error as EmailRateLimitError;
      expect(failure).toBeInstanceOf(EmailRateLimitError);
      expect(failure.code).toBe('EMAIL_RATE_LIMITED');
      expect(failure.retryable).toBe(true);
      expect(failure.retryAfterSeconds).toBe(30);
    }
  });

  it('still raises a rate-limit error when no wait is stated', async () => {
    const { impl } = stubFetch([{ status: 429, body: { name: 'rate_limit_exceeded' } }]);
    try {
      await new ResendProvider({ apiKey: 'k', fetchImpl: impl, retry: { attempts: 1 } }).send(
        email,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as EmailRateLimitError).retryAfterSeconds).toBeUndefined();
      expect((error as Error).message).toMatch(/rate_limit_exceeded/);
    }
  });

  it('reads the key and host from getters, so a rotated key needs no restart', async () => {
    const { impl, calls } = stubFetch([ok]);
    let key = 'old';
    const provider = new ResendProvider({
      apiKey: () => key,
      baseUrl: () => 'https://sandbox.resend.test/',
      fetchImpl: impl,
    });

    await provider.send(email);
    key = 'new';
    await provider.send(email);

    // The trailing slash is trimmed rather than doubling up in the path.
    expect(calls[0].url).toBe('https://sandbox.resend.test/emails');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer old');
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer new');
  });

  it('refuses to send with no key, and knows when it is configured', async () => {
    const { impl } = stubFetch([ok]);
    const provider = new ResendProvider({ apiKey: () => null, fetchImpl: impl });
    await expect(provider.send(email)).rejects.toBeInstanceOf(EmailConfigurationError);
    await expect(provider.isConfigured()).resolves.toBe(false);
    await expect(new ResendProvider({ apiKey: 'k' }).isConfigured()).resolves.toBe(true);
  });
});

describe('createCommunication with email', () => {
  it('builds a Resend-backed client from config', async () => {
    const communication = createCommunication({
      email: { resend: { apiKey: 'k' }, from: 'a@duncit.com' },
    });
    expect(communication.email.provider).toBe('resend');
    await expect(communication.email.isConfigured()).resolves.toBe(true);
  });

  it('prefers an injected provider over the bundled one', async () => {
    const communication = createCommunication({
      email: {
        resend: { apiKey: 'k' },
        provider: {
          name: 'ses',
          isConfigured: async () => true,
          send: async () => ({ messageId: 'x', provider: 'ses', accepted: [], raw: {} }),
        },
        from: 'a@duncit.com',
      },
    });
    expect(communication.email.provider).toBe('ses');
  });

  it('gives both channels even with no config, and both fail loudly', async () => {
    const communication = createCommunication();
    expect(communication.email.provider).toBe('none');
    expect(communication.whatsapp.provider).toBe('none');
    await expect(
      communication.email.send({ category: 'internal', to: 'a@b.com', subject: 's', text: 't' }),
    ).rejects.toBeInstanceOf(EmailConfigurationError);
  });

  it('carries the channel config through from createCommunication', async () => {
    const { impl, calls } = stubFetch([ok]);
    const communication = createCommunication({
      email: {
        resend: { apiKey: 'k', fetchImpl: impl },
        from: 'Duncit <noreply@duncit.com>',
        defaultMetadata: { environment: 'staging' },
      },
    });

    await communication.email.send({
      category: 'transactional',
      to: 'user@example.com',
      subject: 'Booking Confirmed',
      html: '<p>hi</p>',
    });

    expect(JSON.parse(String(calls[0].init.body)).tags).toContainEqual({
      name: 'environment',
      value: 'staging',
    });
  });
});
