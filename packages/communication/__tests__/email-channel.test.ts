import { describe, expect, it, vi } from 'vitest';
import {
  EmailConfigurationError,
  EmailTemplateError,
  EmailValidationError,
  InMemoryTemplateRenderer,
  MockEmailProvider,
  createEmailChannel,
} from '../src/index';
import type { EmailMiddleware, EmailSendOptions } from '../src/index';

const FROM = 'Duncit <noreply@duncit.com>';

const message: EmailSendOptions = {
  category: 'transactional',
  to: 'user@example.com',
  subject: 'Booking Confirmed',
  html: '<p>Pod <b>POD-1021</b> is confirmed.</p>',
};

const channelWith = (config = {}) => {
  const provider = new MockEmailProvider();
  return { provider, email: createEmailChannel(provider, { from: FROM, ...config }) };
};

describe('the send path', () => {
  it('sends and reports what the provider accepted', async () => {
    const { provider, email } = channelWith();

    const result = await email.send({ ...message, cc: ['cc@x.com'], bcc: ['bcc@x.com'] });

    expect(result.provider).toBe('mock');
    expect(result.accepted).toEqual(['user@example.com', 'cc@x.com', 'bcc@x.com']);
    expect(provider.last?.subject).toBe('Booking Confirmed');
    expect(provider.last?.from).toBe(FROM);
  });

  it('validates before the provider is ever reached', async () => {
    const provider = new MockEmailProvider();
    const send = vi.spyOn(provider, 'send');
    await expect(
      createEmailChannel(provider, { from: FROM }).send({ ...message, to: 'bad' }),
    ).rejects.toBeInstanceOf(EmailValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it('derives the text part so no message ships without one', async () => {
    const { provider, email } = channelWith();
    await email.send(message);
    expect(provider.last?.text).toBe('Pod POD-1021 is confirmed.');
  });

  it('keeps the caller’s own text part when they wrote one', async () => {
    const { provider, email } = channelWith();
    await email.send({ ...message, text: 'mine' });
    expect(provider.last?.text).toBe('mine');
  });

  it('carries the category through to the provider', async () => {
    const { provider, email } = channelWith();
    await email.send({ ...message, category: 'billing' });
    expect(provider.last?.category).toBe('billing');
  });

  it('merges channel defaults under the message’s own values', async () => {
    const { provider, email } = channelWith({
      replyTo: 'support@duncit.com',
      defaultTags: ['prod'],
      defaultMetadata: { environment: 'production' },
      defaultHeaders: { 'X-Duncit': '1' },
    });

    await email.send({
      ...message,
      tags: ['booking'],
      metadata: { podId: 'POD-1021' },
      headers: { 'X-Trace': 'abc' },
    });

    expect(provider.last).toMatchObject({
      replyTo: 'support@duncit.com',
      tags: ['prod', 'booking'],
      metadata: { environment: 'production', podId: 'POD-1021' },
      headers: { 'X-Duncit': '1', 'X-Trace': 'abc' },
    });
  });

  it('lets the message override the channel’s from and replyTo', async () => {
    const { provider, email } = channelWith({ replyTo: 'support@duncit.com' });
    await email.send({ ...message, from: 'billing@duncit.com', replyTo: 'ar@duncit.com' });
    expect(provider.last).toMatchObject({ from: 'billing@duncit.com', replyTo: 'ar@duncit.com' });
  });

  it('refuses to send with no from address anywhere', async () => {
    const email = createEmailChannel(new MockEmailProvider());
    await expect(email.send(message)).rejects.toBeInstanceOf(EmailConfigurationError);
  });

  it('reports the provider and its readiness', async () => {
    const email = createEmailChannel(new MockEmailProvider({ configured: false }), { from: FROM });
    expect(email.provider).toBe('mock');
    await expect(email.isConfigured()).resolves.toBe(false);
  });

  it('fails loudly with no provider at all, rather than silently doing nothing', async () => {
    const email = createEmailChannel(null, { from: FROM });
    expect(email.provider).toBe('none');
    await expect(email.isConfigured()).resolves.toBe(false);
    await expect(email.send(message)).rejects.toBeInstanceOf(EmailConfigurationError);
  });
});

describe('idempotency', () => {
  it('gives the same message the same key twice', async () => {
    const { provider, email } = channelWith();
    await email.send(message);
    await email.send(message);
    expect(provider.sent[0].idempotencyKey).toBe(provider.sent[1].idempotencyKey);
  });

  it('uses the caller’s key when they supply one', async () => {
    const { provider, email } = channelWith();
    await email.send({ ...message, idempotencyKey: 'order-991' });
    expect(provider.last?.idempotencyKey).toBe('order-991');
  });

  it('gives two different messages different keys', async () => {
    const { provider, email } = channelWith();
    await email.send(message);
    await email.send({ ...message, subject: 'Booking Cancelled' });
    expect(provider.sent[0].idempotencyKey).not.toBe(provider.sent[1].idempotencyKey);
  });
});

describe('templates', () => {
  const renderer = new InMemoryTemplateRenderer({
    'booking-confirmation': {
      html: '<p>Pod {{bookingId}} for {{amount}}</p>',
      subject: 'Booking {{bookingId}} confirmed',
    },
    'no-subject': { html: '<p>x</p>' },
  });

  it('renders the body and lets the template’s subject win', async () => {
    const { provider, email } = channelWith({ renderer });

    await email.send({
      category: 'transactional',
      template: 'booking-confirmation',
      to: 'user@example.com',
      subject: 'Booking Confirmed',
      variables: { bookingId: 'POD-1021', amount: '₹299' },
    });

    expect(provider.last?.html).toBe('<p>Pod POD-1021 for ₹299</p>');
    // The template's subject is the one an admin edited beside the body.
    expect(provider.last?.subject).toBe('Booking POD-1021 confirmed');
  });

  it('keeps the caller’s subject when the template has none', async () => {
    const { provider, email } = channelWith({ renderer });
    await email.send({ ...message, html: undefined, template: 'no-subject' });
    expect(provider.last?.subject).toBe('Booking Confirmed');
  });

  it('fails loudly when a template is asked for and no renderer is configured', async () => {
    const { email } = channelWith();
    await expect(
      email.send({ ...message, html: undefined, template: 'booking-confirmation' }),
    ).rejects.toBeInstanceOf(EmailTemplateError);
  });

  it('surfaces a missing template by name', async () => {
    const { email } = channelWith({ renderer });
    await expect(email.send({ ...message, html: undefined, template: 'nope' })).rejects.toThrow(
      /No template registered under "nope"/,
    );
  });
});

describe('middleware and hooks', () => {
  it('lets middleware rewrite the message on its way out', async () => {
    const stamp: EmailMiddleware = (email, _context, next) =>
      next({ ...email, subject: `[staging] ${email.subject}` });
    const { provider, email } = channelWith({ middleware: [stamp] });

    await email.send(message);

    expect(provider.last?.subject).toBe('[staging] Booking Confirmed');
  });

  it('lets middleware stop a send — the suppression-list case', async () => {
    const provider = new MockEmailProvider();
    const suppressed = new Set(['user@example.com']);
    const block: EmailMiddleware = async (mail, _context, next) => {
      if (mail.category === 'marketing' && mail.to.some((a) => suppressed.has(a))) {
        return { messageId: null, provider: 'suppressed', accepted: [], raw: {} };
      }
      return next(mail);
    };
    const email = createEmailChannel(provider, { from: FROM, middleware: [block] });

    const blocked = await email.send({ ...message, category: 'marketing' });
    await email.send({ ...message, category: 'transactional' });

    expect(blocked.provider).toBe('suppressed');
    // The transactional one still went — suppression is category-aware.
    expect(provider.sent).toHaveLength(1);
  });

  it('gives middleware the caller’s untouched options and a shared state bag', async () => {
    let seenCategory = '';
    const first: EmailMiddleware = (mail, context, next) => {
      context.state.marker = 'one';
      return next(mail);
    };
    const second: EmailMiddleware = (mail, context, next) => {
      seenCategory = `${context.options.category}:${context.state.marker}:${context.provider}`;
      return next(mail);
    };
    const { email } = channelWith({ middleware: [first, second] });

    await email.send(message);

    expect(seenCategory).toBe('transactional:one:mock');
  });

  it('calls the request and response hooks', async () => {
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const { email } = channelWith({ hooks: { onRequest, onResponse } });

    await email.send(message);

    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onRequest.mock.calls[0][0].subject).toBe('Booking Confirmed');
    expect(onResponse.mock.calls[0][0].provider).toBe('mock');
  });

  it('calls the error hook and still throws', async () => {
    const onError = vi.fn();
    const provider = new MockEmailProvider({ failWith: 'upstream down', retryable: true });
    const email = createEmailChannel(provider, { from: FROM, hooks: { onError } });

    await expect(email.send(message)).rejects.toThrow(/upstream down/);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].retryable).toBe(true);
  });

  it('never lets a broken hook lose an email', async () => {
    const boom = () => {
      throw new Error('metrics are down');
    };
    const { email } = channelWith({ hooks: { onRequest: boom, onResponse: boom } });
    await expect(email.send(message)).resolves.toMatchObject({ provider: 'mock' });
  });

  it('never lets a broken error hook mask the real failure', async () => {
    const provider = new MockEmailProvider({ failWith: 'the real problem' });
    const email = createEmailChannel(provider, {
      from: FROM,
      hooks: {
        onError: () => {
          throw new Error('and the hook is broken too');
        },
      },
    });
    await expect(email.send(message)).rejects.toThrow(/the real problem/);
  });
});

describe('MockEmailProvider', () => {
  it('records, reports the last one, and resets', async () => {
    const { provider, email } = channelWith();
    await email.send(message);
    expect(provider.sent).toHaveLength(1);
    expect(provider.last?.to).toEqual(['user@example.com']);
    provider.reset();
    expect(provider.sent).toHaveLength(0);
    expect(provider.last).toBeUndefined();
  });

  it('answers isConfigured, and its message id is stable', async () => {
    const provider = new MockEmailProvider();
    await expect(provider.isConfigured()).resolves.toBe(true);
    const email = createEmailChannel(provider, { from: FROM });
    const first = await email.send(message);
    const second = await email.send(message);
    expect(first.messageId).toBe(second.messageId);
  });
});
