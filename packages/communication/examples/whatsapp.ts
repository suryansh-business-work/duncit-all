/**
 * Worked examples for @duncit/communication. Every one of these runs against a
 * real client; only the last two swap the transport so nothing leaves the
 * process.
 *
 *   npx tsx packages/communication/examples/whatsapp.ts
 */
import {
  CommunicationConfigError,
  CommunicationProviderError,
  CommunicationValidationError,
  createCommunication,
  type WhatsAppProvider,
  type WhatsAppSendResult,
} from '../src/index';

// ---------------------------------------------------------------------------
// 1. The everyday case: one client, four categories.
// ---------------------------------------------------------------------------
const communication = createCommunication({
  whatsapp: { aisensy: { apiKey: process.env.AISENSY_API_KEY ?? '' } },
});

export async function bookingConfirmed(): Promise<WhatsAppSendResult> {
  return communication.whatsapp.utility.send({
    campaign: 'booking_confirmation',
    to: '+919876543210',
    name: 'Suryansh',
    variables: ['POD-1021', '₹299'],
  });
}

export async function sendOtp(to: string, code: string): Promise<WhatsAppSendResult> {
  return communication.whatsapp.authentication.send({
    campaign: 'login_otp',
    to,
    variables: [code],
  });
}

export async function weekendOffer(to: string, name: string): Promise<WhatsAppSendResult> {
  return communication.whatsapp.marketing.send({
    campaign: 'weekend_offer',
    to,
    name,
    variables: ['25%', 'SUNDAY25'],
    tags: ['weekend', 'q3'],
    attributes: { city: 'Pune' },
  });
}

/** A ticket PDF rides along as media. */
export async function podTicket(to: string, url: string): Promise<WhatsAppSendResult> {
  return communication.whatsapp.utility.send({
    campaign: 'pod_ticket',
    to,
    variables: ['POD-1021'],
    media: { url, filename: 'ticket.pdf' },
  });
}

// ---------------------------------------------------------------------------
// 2. Handling the three failures differently. `retryable` is the field that
//    decides whether trying again is worth anything.
// ---------------------------------------------------------------------------
export async function sendAndReport(to: string): Promise<string> {
  try {
    const result = await communication.whatsapp.utility.send({
      campaign: 'welcome',
      to,
    });
    return `queued as ${result.messageId ?? 'unknown'}`;
  } catch (error) {
    if (error instanceof CommunicationValidationError) {
      return `the message was never sendable — check ${error.field}`;
    }
    if (error instanceof CommunicationConfigError) {
      return 'no API key configured';
    }
    if (error instanceof CommunicationProviderError) {
      return error.retryable ? 'the vendor is having a moment — queue it again' : error.message;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. A rotating key, a logger, and a retry policy of your own.
// ---------------------------------------------------------------------------
let liveKey = process.env.AISENSY_API_KEY ?? '';

export const production = createCommunication({
  whatsapp: {
    aisensy: {
      // A getter, so a key rotated in the Tech portal applies without a restart.
      apiKey: () => liveKey,
      retry: { attempts: 5, backoffMs: 500, maxBackoffMs: 8000 },
      timeoutMs: 20_000,
      // `detail.body.apiKey` is already '[redacted]' by the time this runs.
      logger: (event) => console.info('[wa]', event.phase, event.attempt, event.detail),
    },
  },
});

export function rotateKey(next: string): void {
  liveKey = next;
}

// ---------------------------------------------------------------------------
// 4. Another vendor. Three members, and no call site above changes.
// ---------------------------------------------------------------------------
class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta-cloud';

  constructor(private readonly token: string) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(this.token);
  }

  async send(): Promise<WhatsAppSendResult> {
    // Map the options into Meta's payload here; the shape of the return is what
    // the rest of the package agrees on.
    return { messageId: 'wamid.demo', provider: this.name, raw: {} };
  }
}

export const onMeta = createCommunication({
  whatsapp: { provider: new MetaCloudProvider(process.env.META_TOKEN ?? '') },
});

// ---------------------------------------------------------------------------
// 5. In a test: a fake provider records the send and nothing leaves the process.
// ---------------------------------------------------------------------------
export function recordingClient() {
  const sent: Array<{ campaign: string; to: string }> = [];
  const client = createCommunication({
    whatsapp: {
      provider: {
        name: 'recording',
        isConfigured: async () => true,
        send: async (options) => {
          sent.push({ campaign: options.campaign, to: options.to });
          return { messageId: 'test', provider: 'recording', raw: {} };
        },
      },
    },
  });
  return { client, sent };
}

if (process.env.RUN_EXAMPLES === '1') {
  const { client, sent } = recordingClient();
  await client.whatsapp.utility.send({
    campaign: 'booking_confirmation',
    to: '+919876543210',
    name: 'Suryansh',
    variables: ['POD-1021', '₹299'],
  });
  console.info('recorded:', sent);
  console.info('validation:', await sendAndReport('9876543210'));
}
