import { describe, expect, it } from 'vitest';
import { makeWaGatewaySchema, WA_API_KEY_MAX } from '../src/schemas/wa-gateway';

/** The WhatsApp Lead Generator's gateway step: the key is echoed, so each assertion names the message shown. */
const echo = (key: string) => key;
const messages = (hasKey: boolean, values: { base_url: string; api_key: string }) => {
  const result = makeWaGatewaySchema(echo, hasKey).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};
const base_url = 'https://wa.example.test';

describe('makeWaGatewaySchema', () => {
  it('trims both fields and accepts an https gateway with a key', () => {
    const result = makeWaGatewaySchema(echo, false).safeParse({ base_url: ` ${base_url} `, api_key: ' k1 ' });
    expect(result.success && result.data).toEqual({ base_url, api_key: 'k1' });
  });

  it('asks for a URL when blank', () => {
    expect(messages(true, { base_url: '   ', api_key: '' })).toEqual(['crm.tools.gatewayUrlRequired']);
  });

  it('refuses a URL that is not http(s)', () => {
    expect(messages(true, { base_url: 'open-wa-server', api_key: '' })).toEqual(['crm.tools.gatewayUrlInvalid']);
    expect(messages(true, { base_url: 'ftp://wa.example.test', api_key: '' })).toEqual(['crm.tools.gatewayUrlInvalid']);
  });

  it('requires a key until one is saved, then lets a blank field keep it', () => {
    expect(messages(false, { base_url, api_key: ' ' })).toEqual(['crm.tools.apiKeyRequired']);
    expect(messages(true, { base_url, api_key: '' })).toEqual([]);
  });

  it('accepts a key at the cap and refuses one character more', () => {
    expect(messages(false, { base_url, api_key: 'k'.repeat(WA_API_KEY_MAX) })).toEqual([]);
    expect(messages(false, { base_url, api_key: 'k'.repeat(WA_API_KEY_MAX + 1) })).toEqual(['crm.tools.apiKeyTooLong']);
  });
});
