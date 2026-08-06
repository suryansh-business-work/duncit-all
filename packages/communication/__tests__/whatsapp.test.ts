import { describe, expect, it, vi } from 'vitest';
import {
  CommunicationConfigError,
  CommunicationValidationError,
  assertValidSendOptions,
  createCommunication,
  createWhatsAppChannel,
} from '../src/index';
import type { WhatsAppProvider, WhatsAppSendOptions } from '../src/types';

/** A provider that records what it was asked to send and never leaves the process. */
function fakeProvider(overrides: Partial<WhatsAppProvider> = {}) {
  const sent: WhatsAppSendOptions[] = [];
  const provider: WhatsAppProvider = {
    name: 'fake',
    isConfigured: async () => true,
    send: async (options) => {
      sent.push(options);
      return { messageId: 'msg_1', provider: 'fake', raw: { ok: true } };
    },
    ...overrides,
  };
  return { provider, sent };
}

describe('validation', () => {
  it('rejects a missing options object', () => {
    expect(() => assertValidSendOptions(undefined as never)).toThrow(CommunicationValidationError);
  });

  it('requires a campaign', () => {
    expect(() => assertValidSendOptions({ campaign: '   ', to: '+919876543210' })).toThrow(
      /campaign is required/,
    );
  });

  it('requires a destination', () => {
    expect(() => assertValidSendOptions({ campaign: 'c', to: '' })).toThrow(/to is required/);
  });

  it('requires E.164 — a bare 10-digit number is the common mistake', () => {
    expect(() => assertValidSendOptions({ campaign: 'c', to: '9876543210' })).toThrow(/E.164/);
    expect(() => assertValidSendOptions({ campaign: 'c', to: '+0123456789' })).toThrow(/E.164/);
  });

  it('names the field at fault', () => {
    try {
      assertValidSendOptions({ campaign: 'c', to: 'nope' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as CommunicationValidationError).field).toBe('to');
      expect((error as CommunicationValidationError).retryable).toBe(false);
    }
  });

  it('rejects variables that are not an array', () => {
    expect(() =>
      assertValidSendOptions({
        campaign: 'c',
        to: '+919876543210',
        variables: 'POD' as never,
      }),
    ).toThrow(/variables must be an array/);
  });

  it('rejects a blank placeholder, which would ship as "null" to the customer', () => {
    expect(() =>
      assertValidSendOptions({
        campaign: 'c',
        to: '+919876543210',
        variables: ['a', '', 'b'],
      }),
    ).toThrow(/variables\[1\] is empty/);
    expect(() =>
      assertValidSendOptions({
        campaign: 'c',
        to: '+919876543210',
        variables: ['a', null as never],
      }),
    ).toThrow(/variables\[1\] is empty/);
  });

  it('requires a url when media is given', () => {
    expect(() =>
      assertValidSendOptions({
        campaign: 'c',
        to: '+919876543210',
        media: {} as never,
      }),
    ).toThrow(/media.url is required/);
  });

  it('accepts a full, valid message', () => {
    expect(() =>
      assertValidSendOptions({
        campaign: 'booking_confirmation',
        to: '+919876543210',
        name: 'Suryansh',
        variables: ['POD-1021', 299],
        media: { url: 'https://x/y.pdf', filename: 'ticket.pdf' },
      }),
    ).not.toThrow();
  });
});

describe('the channel', () => {
  it('sends through the provider and returns its result', async () => {
    const { provider, sent } = fakeProvider();
    const whatsapp = createWhatsAppChannel(provider);

    const result = await whatsapp.send({ campaign: 'c', to: '+919876543210' });

    expect(result).toEqual({
      messageId: 'msg_1',
      provider: 'fake',
      raw: { ok: true },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].campaign).toBe('c');
  });

  it('trims the campaign and the number before they reach the provider', async () => {
    const { provider, sent } = fakeProvider();
    await createWhatsAppChannel(provider).send({
      campaign: '  c  ',
      to: '  +919876543210  ',
    });
    expect(sent[0]).toMatchObject({ campaign: 'c', to: '+919876543210' });
  });

  it.each([
    ['utility', 'UTILITY'],
    ['marketing', 'MARKETING'],
    ['authentication', 'AUTHENTICATION'],
    ['service', 'SERVICE'],
  ] as const)('%s.send sets the category for the caller', async (helper, category) => {
    const { provider, sent } = fakeProvider();
    const whatsapp = createWhatsAppChannel(provider);

    await whatsapp[helper].send({ campaign: 'c', to: '+919876543210' });

    expect(sent[0].category).toBe(category);
  });

  it('validates before the provider is ever called', async () => {
    const send = vi.fn();
    const { provider } = fakeProvider({ send });
    await expect(
      createWhatsAppChannel(provider).marketing.send({
        campaign: '',
        to: '+919876543210',
      }),
    ).rejects.toBeInstanceOf(CommunicationValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it('throws a config error when there is no provider at all', async () => {
    const whatsapp = createWhatsAppChannel(null);
    await expect(whatsapp.send({ campaign: 'c', to: '+919876543210' })).rejects.toBeInstanceOf(
      CommunicationConfigError,
    );
    expect(whatsapp.provider).toBe('none');
    await expect(whatsapp.isConfigured()).resolves.toBe(false);
  });

  it('reports the provider name and its readiness', async () => {
    const { provider } = fakeProvider({ isConfigured: async () => false });
    const whatsapp = createWhatsAppChannel(provider);
    expect(whatsapp.provider).toBe('fake');
    await expect(whatsapp.isConfigured()).resolves.toBe(false);
  });
});

describe('createCommunication', () => {
  it('builds an AiSensy-backed client from config', async () => {
    const communication = createCommunication({
      whatsapp: { aisensy: { apiKey: 'k' } },
    });
    expect(communication.whatsapp.provider).toBe('aisensy');
    await expect(communication.whatsapp.isConfigured()).resolves.toBe(true);
  });

  it('takes an injected provider, and prefers it over the bundled one', async () => {
    const { provider } = fakeProvider();
    const communication = createCommunication({
      whatsapp: { aisensy: { apiKey: 'k' }, provider },
    });
    expect(communication.whatsapp.provider).toBe('fake');
  });

  it('still returns a client with no config — sends fail loudly, not silently', async () => {
    const communication = createCommunication();
    await expect(
      communication.whatsapp.send({ campaign: 'c', to: '+919876543210' }),
    ).rejects.toBeInstanceOf(CommunicationConfigError);
  });
});
