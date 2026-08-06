import { describe, expect, it, vi } from 'vitest';
import {
  AiSensyProvider,
  CommunicationConfigError,
  CommunicationProviderError,
} from '../src/index';

/** A fetch that answers whatever the test says, and records what it was given. */
function stubFetch(answers: Array<{ status: number; body: unknown } | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const queue = [...answers];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      json: async () => next.body,
    } as unknown as Response;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const ok = {
  status: 200,
  body: { success: 'true', submitted_message_id: 'sm_1' },
};

describe('AiSensyProvider', () => {
  it('maps the options into AiSensy field names', async () => {
    const { impl, calls } = stubFetch([ok]);
    const provider = new AiSensyProvider({ apiKey: 'key_1', fetchImpl: impl });

    await provider.send({
      campaign: 'booking_confirmation',
      to: '+919876543210',
      name: 'Suryansh',
      variables: ['POD-1021', 299],
      category: 'UTILITY',
      source: 'checkout',
      tags: ['pod'],
      attributes: { city: 'Pune' },
      media: { url: 'https://x/y.pdf', filename: 'ticket.pdf' },
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(calls[0].url).toBe('https://backend.aisensy.com/campaign/t1/api/v2');
    expect(body).toMatchObject({
      apiKey: 'key_1',
      campaignName: 'booking_confirmation',
      // E.164 goes in; AiSensy's own digits-only form goes out.
      destination: '919876543210',
      userName: 'Suryansh',
      // Positional, and stringified: AiSensy rejects numbers here.
      templateParams: ['POD-1021', '299'],
      templateCategory: 'UTILITY',
      source: 'checkout',
      tags: ['pod'],
      attributes: { city: 'Pune' },
      media: { url: 'https://x/y.pdf', filename: 'ticket.pdf' },
    });
  });

  it('falls back to the number when no name is given — AiSensy rejects an empty one', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new AiSensyProvider({ apiKey: 'k', fetchImpl: impl }).send({
      campaign: 'c',
      to: '+919876543210',
    });
    expect(JSON.parse(String(calls[0].init.body)).userName).toBe('+919876543210');
  });

  it('omits media, tags and attributes when there are none', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new AiSensyProvider({ apiKey: 'k', fetchImpl: impl }).send({
      campaign: 'c',
      to: '+919876543210',
      tags: [],
      attributes: {},
    });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).not.toHaveProperty('media');
    expect(body).not.toHaveProperty('tags');
    expect(body).not.toHaveProperty('attributes');
  });

  it('sends media without a filename when none is given', async () => {
    const { impl, calls } = stubFetch([ok]);
    await new AiSensyProvider({ apiKey: 'k', fetchImpl: impl }).send({
      campaign: 'c',
      to: '+919876543210',
      media: { url: 'https://x/y.jpg' },
    });
    expect(JSON.parse(String(calls[0].init.body)).media).toEqual({
      url: 'https://x/y.jpg',
    });
  });

  it('returns the queued message id', async () => {
    const { impl } = stubFetch([ok]);
    const result = await new AiSensyProvider({
      apiKey: 'k',
      fetchImpl: impl,
    }).send({
      campaign: 'c',
      to: '+919876543210',
    });
    expect(result).toEqual({
      messageId: 'sm_1',
      provider: 'aisensy',
      raw: { success: 'true', submitted_message_id: 'sm_1' },
    });
  });

  it('treats a 200 with success:"false" as a FAILURE — res.ok alone is not enough', async () => {
    const { impl } = stubFetch([
      {
        status: 200,
        body: { success: 'false', message: 'Template not approved' },
      },
    ]);
    await expect(
      new AiSensyProvider({ apiKey: 'k', fetchImpl: impl }).send({
        campaign: 'c',
        to: '+919876543210',
      })
    ).rejects.toThrow(/Template not approved/);
  });

  it('reports a null message id rather than inventing one', async () => {
    const { impl } = stubFetch([{ status: 200, body: { success: 'true' } }]);
    const result = await new AiSensyProvider({
      apiKey: 'k',
      fetchImpl: impl,
    }).send({
      campaign: 'c',
      to: '+919876543210',
    });
    expect(result.messageId).toBeNull();
  });

  it('marks a rejected key as NOT retryable — repeating it just burns the limit', async () => {
    const { impl } = stubFetch([{ status: 401, body: { message: 'Invalid API key' } }]);
    try {
      await new AiSensyProvider({
        apiKey: 'k',
        fetchImpl: impl,
        retry: { attempts: 1 },
      }).send({
        campaign: 'c',
        to: '+919876543210',
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      const failure = error as CommunicationProviderError;
      expect(failure.status).toBe(401);
      expect(failure.retryable).toBe(false);
      expect(failure.provider).toBe('aisensy');
    }
  });

  it('marks a 5xx as retryable', async () => {
    const { impl } = stubFetch([{ status: 503, body: {} }]);
    try {
      await new AiSensyProvider({
        apiKey: 'k',
        fetchImpl: impl,
        retry: { attempts: 1 },
      }).send({
        campaign: 'c',
        to: '+919876543210',
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as CommunicationProviderError).retryable).toBe(true);
      // No message field: it falls back to the status rather than "undefined".
      expect((error as Error).message).toMatch(/HTTP 503/);
    }
  });

  it('reads the key and base url from getters, so a rotated key needs no restart', async () => {
    const { impl, calls } = stubFetch([ok]);
    let key = 'old';
    const provider = new AiSensyProvider({
      apiKey: () => key,
      baseUrl: () => 'https://sandbox.aisensy.test/',
      fetchImpl: impl,
    });

    await provider.send({ campaign: 'c', to: '+919876543210' });
    key = 'new';
    await provider.send({ campaign: 'c', to: '+919876543210' });

    // The trailing slash is trimmed rather than doubling up in the path.
    expect(calls[0].url).toBe('https://sandbox.aisensy.test/campaign/t1/api/v2');
    expect(JSON.parse(String(calls[0].init.body)).apiKey).toBe('old');
    expect(JSON.parse(String(calls[1].init.body)).apiKey).toBe('new');
  });

  it('refuses to send with no key', async () => {
    const { impl } = stubFetch([ok]);
    const provider = new AiSensyProvider({
      apiKey: () => null,
      fetchImpl: impl,
    });
    await expect(provider.send({ campaign: 'c', to: '+919876543210' })).rejects.toBeInstanceOf(
      CommunicationConfigError
    );
    await expect(provider.isConfigured()).resolves.toBe(false);
  });

  it('knows when it is configured', async () => {
    await expect(new AiSensyProvider({ apiKey: 'k' }).isConfigured()).resolves.toBe(true);
  });
});
