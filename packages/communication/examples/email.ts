/**
 * Worked examples for the email channel.
 *
 *   npx tsx packages/communication/examples/email.ts
 *
 * The last three swap the provider for the bundled mock, so nothing here can
 * reach a real inbox by accident.
 */
import {
  EmailConfigurationError,
  EmailProviderError,
  EmailRateLimitError,
  EmailTemplateError,
  EmailValidationError,
  InMemoryTemplateRenderer,
  MockEmailProvider,
  createCommunication,
  type EmailMiddleware,
  type EmailSendResult,
} from '../src/index';

// ---------------------------------------------------------------------------
// 1. The everyday case. One `send`, and the category says why.
// ---------------------------------------------------------------------------
const communication = createCommunication({
  email: {
    resend: { apiKey: process.env.RESEND_API_KEY ?? '' },
    from: 'Duncit <noreply@duncit.com>',
    replyTo: 'support@duncit.com',
  },
});

export async function bookingConfirmed(): Promise<EmailSendResult> {
  return communication.email.send({
    category: 'transactional',
    template: 'booking-confirmation',
    to: 'user@example.com',
    subject: 'Booking Confirmed',
    variables: { bookingId: 'POD-1021', amount: '₹299' },
  });
}

/** Several recipients, a copy for the team, a hidden copy for the archive. */
export async function invoiceIssued(): Promise<EmailSendResult> {
  return communication.email.send({
    category: 'billing',
    to: ['buyer@example.com', 'accounts@example.com'],
    cc: ['sales@duncit.com'],
    bcc: ['archive@duncit.com'],
    subject: 'Invoice INV-2291',
    html: '<p>Your invoice for <b>₹299</b> is attached.</p>',
    attachments: [
      { filename: 'INV-2291.pdf', content: 'PDF-BYTES', contentType: 'application/pdf' },
    ],
    metadata: { invoiceNo: 'INV-2291' },
    tags: ['invoice'],
    // A queue redelivering this job must not bill anyone twice.
    idempotencyKey: 'invoice-INV-2291',
  });
}

/** An OTP: authentication, and no marketing footer will ever be added to it. */
export async function loginCode(to: string, code: string): Promise<EmailSendResult> {
  return communication.email.send({
    category: 'authentication',
    to,
    subject: 'Your Duncit sign-in code',
    text: `Your code is ${code}. It expires in 10 minutes.`,
  });
}

// ---------------------------------------------------------------------------
// 2. Templates. The renderer is an interface, so a server that renders MJML out
//    of a database plugs in exactly the same way this in-memory one does.
// ---------------------------------------------------------------------------
const renderer = new InMemoryTemplateRenderer({
  'booking-confirmation': {
    subject: 'Booking {{bookingId}} confirmed',
    html: '<p>Hi {{name}}, pod <b>{{bookingId}}</b> is confirmed for {{amount}}.</p>',
  },
});

export const templated = createCommunication({
  email: {
    resend: { apiKey: process.env.RESEND_API_KEY ?? '' },
    from: 'noreply@duncit.com',
    renderer,
  },
});

// ---------------------------------------------------------------------------
// 3. Middleware. It can rewrite the message or refuse it — this is where a
//    staging redirect and a suppression list belong, not in every call site.
// ---------------------------------------------------------------------------

/** Nothing sent from staging may reach a real customer. */
const redirectInStaging: EmailMiddleware = (email, _context, next) => {
  if (process.env.ENVIRONMENT !== 'staging') return next(email);
  return next({
    ...email,
    subject: `[to: ${email.to.join(',')}] ${email.subject}`,
    to: ['qa@duncit.com'],
    cc: [],
    bcc: [],
  });
};

/** Unsubscribes apply to marketing. A booking receipt is not optional. */
const unsubscribed = new Set<string>(['opted.out@example.com']);
const honourUnsubscribes: EmailMiddleware = async (email, _context, next) => {
  const blocked = email.category === 'marketing' && email.to.some((a) => unsubscribed.has(a));
  if (!blocked) return next(email);
  return { messageId: null, provider: 'suppressed', accepted: [], raw: { reason: 'unsubscribed' } };
};

export const guarded = createCommunication({
  email: {
    resend: { apiKey: process.env.RESEND_API_KEY ?? '' },
    from: 'noreply@duncit.com',
    middleware: [redirectInStaging, honourUnsubscribes],
    // Hooks only watch. A metrics counter must never be able to change a message.
    hooks: {
      onRequest: (email) => console.info('[email] sending', email.category, email.subject),
      onResponse: (result) => console.info('[email] accepted', result.messageId),
      onError: (error) => console.error('[email] failed', error),
    },
    defaultMetadata: { environment: process.env.ENVIRONMENT ?? 'local' },
  },
});

// ---------------------------------------------------------------------------
// 4. Failures, handled by kind rather than by reading a string.
// ---------------------------------------------------------------------------
export async function sendAndReport(to: string): Promise<string> {
  try {
    const result = await communication.email.send({
      category: 'notification',
      to,
      subject: 'Your pod starts in an hour',
      html: '<p>See you there.</p>',
    });
    return `accepted as ${result.messageId ?? 'unknown'}`;
  } catch (error) {
    if (error instanceof EmailValidationError) return `never sendable — check ${error.field}`;
    if (error instanceof EmailTemplateError) return `template "${error.template}" is broken`;
    if (error instanceof EmailConfigurationError) return 'no API key or no from address';
    if (error instanceof EmailRateLimitError) {
      return `throttled — retry in ${error.retryAfterSeconds ?? 60}s`;
    }
    if (error instanceof EmailProviderError) {
      return error.retryable ? 'the vendor is having a moment — queue it again' : error.message;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. In a test: the mock provider records the message and never leaves the
//    process. Reach for this rather than writing another stub.
// ---------------------------------------------------------------------------
export function testClient() {
  const provider = new MockEmailProvider();
  const client = createCommunication({
    email: { provider, from: 'noreply@duncit.com', renderer },
  });
  return { client, provider };
}

if (process.env.RUN_EXAMPLES === '1') {
  const { client, provider } = testClient();
  await client.email.send({
    category: 'transactional',
    template: 'booking-confirmation',
    to: 'user@example.com',
    subject: 'Booking Confirmed',
    variables: { name: 'Suryansh', bookingId: 'POD-1021', amount: '₹299' },
  });
  console.info('subject:', provider.last?.subject);
  console.info('text part, derived:', provider.last?.text);
  console.info('validation:', await sendAndReport('not-an-email'));
}
