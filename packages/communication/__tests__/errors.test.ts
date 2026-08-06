import { describe, expect, it } from 'vitest';
import {
  CommunicationConfigError,
  CommunicationError,
  CommunicationProviderError,
  CommunicationValidationError,
  createWhatsAppChannel,
} from '../src/index';
import type { WhatsAppProvider } from '../src/types';

describe('the error types', () => {
  it('defaults to not-retryable and carries no provider when none was reached', () => {
    const error = new CommunicationError('boom', { code: 'X' });
    expect(error.retryable).toBe(false);
    expect(error.provider).toBeUndefined();
    expect(error.cause).toBeUndefined();
    // The name is the subclass's, so a log line says which kind it was.
    expect(error.name).toBe('CommunicationError');
  });

  it('carries a cause and a provider when it has them', () => {
    const cause = { message: 'upstream' };
    const error = new CommunicationError('boom', {
      code: 'X',
      provider: 'p',
      retryable: true,
      cause,
    });
    expect(error).toMatchObject({ provider: 'p', retryable: true, cause });
  });

  it('names the field on a validation failure', () => {
    const error = new CommunicationValidationError('bad', 'to');
    expect(error).toBeInstanceOf(CommunicationError);
    expect(error).toMatchObject({
      field: 'to',
      code: 'VALIDATION_FAILED',
      retryable: false,
    });
    expect(error.name).toBe('CommunicationValidationError');
  });

  it('reports a config failure with and without a provider', () => {
    expect(new CommunicationConfigError('no key', 'aisensy').provider).toBe('aisensy');
    expect(new CommunicationConfigError('no provider').provider).toBeUndefined();
  });

  it('defaults a provider failure to not-retryable and no status', () => {
    const error = new CommunicationProviderError('refused', { provider: 'p' });
    expect(error.retryable).toBe(false);
    expect(error.status).toBeUndefined();
    expect(error.code).toBe('PROVIDER_FAILED');
  });
});

describe('validation edges', () => {
  const provider: WhatsAppProvider = {
    name: 'fake',
    isConfigured: async () => true,
    send: async () => ({ messageId: null, provider: 'fake', raw: {} }),
  };

  it('rejects a non-string campaign and a non-string destination', async () => {
    const whatsapp = createWhatsAppChannel(provider);
    await expect(whatsapp.send({ campaign: 42 as never, to: '+919876543210' })).rejects.toThrow(
      /campaign is required/
    );
    await expect(whatsapp.send({ campaign: 'c', to: 42 as never })).rejects.toThrow(
      /to is required/
    );
  });
});
