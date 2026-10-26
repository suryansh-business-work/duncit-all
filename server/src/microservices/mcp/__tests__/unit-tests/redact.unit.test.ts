import { REDACTED, redactArgs } from '../../usage/redact';

const parsed = (value: unknown) => JSON.parse(redactArgs(value));

describe('redactArgs', () => {
  it('keeps ordinary arguments exactly as the AI sent them', () => {
    const args = { pod_id: 'p1', pod_hashtag: ['run'], seats_taken: 3, pin_code: '560001', mcp_reason: 'Join the pod' };
    expect(parsed(args)).toEqual(args);
  });

  it('replaces every credential, however deep', () => {
    expect(parsed({ password: 'hunter2', input: { access_token: 'abc', profile: { api_key: 'k', dev_otp: '123456' } } })).toEqual({
      password: REDACTED,
      input: { access_token: REDACTED, profile: { api_key: REDACTED, dev_otp: REDACTED } },
    });
  });

  it('redacts a credential key whatever its value is, objects included', () => {
    expect(parsed({ client_secret: { nested: 'x' }, recovery_codes: ['a', 'b'] })).toEqual({ client_secret: REDACTED, recovery_codes: REDACTED });
  });

  it('keeps a string of 500 characters and cuts a longer one, noting how much was cut', () => {
    expect(parsed({ text: 'a'.repeat(500) }).text).toBe('a'.repeat(500));
    expect(parsed({ text: 'a'.repeat(750) }).text).toBe(`${'a'.repeat(500)}… (+250 chars)`);
  });

  it('keeps 50 list items and notes the rest', () => {
    expect(parsed({ ids: Array.from({ length: 50 }, (_, i) => i) }).ids).toHaveLength(50);
    const ids = parsed({ ids: Array.from({ length: 53 }, (_, i) => i) }).ids as unknown[];
    expect(ids).toHaveLength(51);
    expect(ids[49]).toBe(49);
    expect(ids[50]).toBe('… (+3 items)');
  });

  it('stops descending after six levels', () => {
    expect(parsed({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toEqual({ a: { b: { c: { d: { e: { f: '[…]' } } } } } });
  });

  it('still shows a string at any depth', () => {
    expect(parsed({ a: { b: { c: { d: { e: { f: 'deep' } } } } } })).toEqual({ a: { b: { c: { d: { e: { f: 'deep' } } } } } });
  });

  it('caps the whole preview at 8,000 characters', () => {
    const text = redactArgs(Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, 'x'.repeat(400)])));
    expect(text).toHaveLength(8_001);
    expect(text.endsWith('…')).toBe(true);
  });

  it('writes primitives and missing arguments as JSON', () => {
    expect(redactArgs(undefined)).toBe('null');
    expect(redactArgs(null)).toBe('null');
    expect(redactArgs(7)).toBe('7');
    expect(redactArgs('hello')).toBe('"hello"');
  });

  it('does not change the arguments it was given', () => {
    const args = { password: 'hunter2', text: 'a'.repeat(600) };
    redactArgs(args);
    expect(args.password).toBe('hunter2');
    expect(args.text).toHaveLength(600);
  });
});
