import { describe, expect, it, vi } from 'vitest';
import { EmailRateLimitError, InMemoryTemplateRenderer, createCommunication } from '../src/index';
import type { CommunicationLogEvent, EmailMiddleware } from '../src/index';

/**
 * The whole stack in one go: config → validation → template → middleware →
 * hooks → provider → transport, with only `fetch` replaced.
 *
 * The unit tests each prove one layer. These prove the layers agree — which is
 * where the interesting failures live, because every one of them is a boundary
 * two people wrote separately.
 */

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

const renderer = new InMemoryTemplateRenderer({
  'booking-confirmation': {
    subject: 'Booking {{bookingId}} confirmed',
    html: '<p>Hi {{name}}, pod <b>{{bookingId}}</b> is confirmed for {{amount}}.</p><script>x()</script>',
  },
});

describe('a templated transactional send, end to end', () => {
  it('renders, tags, derives the text part, and reaches Resend once', async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: 're_1' } }]);
    const logged: CommunicationLogEvent[] = [];

    const communication = createCommunication({
      email: {
        resend: { apiKey: 'key_live', fetchImpl: impl, logger: (event) => logged.push(event) },
        from: 'Duncit <noreply@duncit.com>',
        replyTo: 'support@duncit.com',
        renderer,
        defaultMetadata: { environment: 'staging' },
      },
    });

    const result = await communication.email.send({
      category: 'transactional',
      template: 'booking-confirmation',
      to: 'user@example.com',
      subject: 'Booking Confirmed',
      variables: { name: 'Suryansh', bookingId: 'POD-1021', amount: '₹299' },
      metadata: { podId: 'POD-1021' },
      attachments: [{ filename: 'ticket.pdf', content: 'PDF', contentType: 'application/pdf' }],
    });

    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0].init.body));

    // The template's subject won over the caller's.
    expect(body.subject).toBe('Booking POD-1021 confirmed');
    expect(body.html).toContain('pod <b>POD-1021</b> is confirmed for ₹299');
    // The derived text part carries the words and not the script.
    expect(body.text).toBe('Hi Suryansh, pod POD-1021 is confirmed for ₹299.');
    expect(body.reply_to).toBe('support@duncit.com');
    expect(body.attachments[0]).toEqual({
      filename: 'ticket.pdf',
      content: 'UERG',
      content_type: 'application/pdf',
    });
    expect(body.tags).toEqual([
      { name: 'category', value: 'transactional' },
      { name: 'environment', value: 'staging' },
      { name: 'podId', value: 'POD-1021' },
    ]);
    expect(result).toMatchObject({ messageId: 're_1', provider: 'resend' });

    // The key never reaches a log line — it is a header here, and the body is
    // what gets logged.
    expect(JSON.stringify(logged)).not.toContain('key_live');
  });

  it('retries a 503 and does not send twice — the key is identical on both attempts', async () => {
    const { impl, calls } = stubFetch([{ status: 503 }, { status: 200, body: { id: 're_2' } }]);

    const communication = createCommunication({
      email: {
        resend: {
          apiKey: 'k',
          fetchImpl: impl,
          retry: { attempts: 3, backoffMs: 1, maxBackoffMs: 2 },
        },
        from: 'noreply@duncit.com',
      },
    });

    const result = await communication.email.send({
      category: 'billing',
      to: 'user@example.com',
      subject: 'Your invoice',
      html: '<p>₹299</p>',
    });

    expect(calls).toHaveLength(2);
    const first = (calls[0].init.headers as Record<string, string>)['Idempotency-Key'];
    const second = (calls[1].init.headers as Record<string, string>)['Idempotency-Key'];
    // Same key on the retry: Resend de-duplicates, so the customer gets ONE invoice.
    expect(first).toBe(second);
    expect(result.messageId).toBe('re_2');
  });

  it('surfaces a rate limit as its own error, with the wait, and does not keep hammering', async () => {
    const { impl, calls } = stubFetch([
      { status: 429, body: { message: 'Too many requests' }, headers: { 'retry-after': '12' } },
    ]);

    const communication = createCommunication({
      email: {
        resend: {
          apiKey: 'k',
          fetchImpl: impl,
          retry: { attempts: 2, backoffMs: 1, maxBackoffMs: 2 },
        },
        from: 'noreply@duncit.com',
      },
    });

    try {
      await communication.email.send({
        category: 'marketing',
        to: 'user@example.com',
        subject: 'Weekend offer',
        html: '<p>25% off</p>',
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      const failure = error as EmailRateLimitError;
      expect(failure).toBeInstanceOf(EmailRateLimitError);
      expect(failure.retryAfterSeconds).toBe(12);
      // The transport already used its retries on the 429 before giving up.
      expect(calls).toHaveLength(2);
    }
  });

  it('lets a staging middleware redirect every recipient without touching a call site', async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: 're_3' } }]);

    // The reason middleware exists: a staging deploy must not email real people.
    const redirect: EmailMiddleware = (email, _context, next) =>
      next({
        ...email,
        subject: `[to: ${email.to.join(',')}] ${email.subject}`,
        to: ['qa@duncit.com'],
        cc: [],
        bcc: [],
      });

    const communication = createCommunication({
      email: {
        resend: { apiKey: 'k', fetchImpl: impl },
        from: 'noreply@duncit.com',
        middleware: [redirect],
      },
    });

    await communication.email.send({
      category: 'notification',
      to: ['real.customer@example.com'],
      cc: ['manager@example.com'],
      subject: 'Pod starts in an hour',
      html: '<p>see you</p>',
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual(['qa@duncit.com']);
    expect(body).not.toHaveProperty('cc');
    expect(body.subject).toBe('[to: real.customer@example.com] Pod starts in an hour');
  });

  it('sends both channels from one client', async () => {
    const { impl: emailFetch, calls: emailCalls } = stubFetch([
      { status: 200, body: { id: 're_4' } },
    ]);
    const { impl: waFetch, calls: waCalls } = stubFetch([
      { status: 200, body: { success: 'true', submitted_message_id: 'sm_1' } },
    ]);

    const communication = createCommunication({
      whatsapp: { aisensy: { apiKey: 'wa_key', fetchImpl: waFetch } },
      email: { resend: { apiKey: 'em_key', fetchImpl: emailFetch }, from: 'noreply@duncit.com' },
    });

    await communication.email.send({
      category: 'authentication',
      to: 'user@example.com',
      subject: 'Your code',
      text: '123456',
    });
    await communication.whatsapp.authentication.send({
      campaign: 'login_otp',
      to: '+919876543210',
      variables: ['123456'],
    });

    expect(emailCalls[0].url).toBe('https://api.resend.com/emails');
    expect(waCalls[0].url).toBe('https://backend.aisensy.com/campaign/t1/api/v2');
  });
});
