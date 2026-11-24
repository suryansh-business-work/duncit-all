import { GraphQLError } from 'graphql';
import { deviceCallInputSchema, deviceCallRecordingSchema, parseOrThrow } from '../../deviceCall.input';
import { durationLabel, timelineSummary } from '../../deviceCall.service';

/**
 * What the Duncit CRM app may report about a phone call. The API is the gate:
 * a malformed report must be refused with every bad field named, never stored.
 */

const valid = () => ({
  client_call_id: 'dev-1:4211',
  entity_type: 'VENUE_LEAD',
  entity_id: '64b000000000000000000001',
  contact_number: '+91 98110 00001',
  contact_name: 'Rohit',
  direction: 'OUTBOUND',
  outcome: 'COMPLETED',
  started_at: new Date(Date.now() - 60_000).toISOString(),
  duration_seconds: 134,
  note: 'Interested in weekend slots',
});

describe('deviceCallInputSchema', () => {
  it('accepts a complete report and trims its text', () => {
    const parsed = parseOrThrow(deviceCallInputSchema, { ...valid(), note: '  hi  ' });
    expect(parsed.note).toBe('hi');
    expect(parsed.duration_seconds).toBe(134);
  });

  it('accepts a report without the optional name and note', () => {
    const { contact_name: _n, note: _note, ...rest } = valid();
    expect(() => parseOrThrow(deviceCallInputSchema, rest)).not.toThrow();
  });

  it.each([
    ['client_call_id', { client_call_id: 'has spaces' }],
    ['client_call_id', { client_call_id: '' }],
    ['entity_type', { entity_type: 'USER_LEAD' }],
    ['entity_id', { entity_id: 'nope' }],
    ['contact_number', { contact_number: '12345' }],
    ['direction', { direction: 'SIDEWAYS' }],
    ['outcome', { outcome: 'MAYBE' }],
    ['started_at', { started_at: 'yesterday' }],
    ['duration_seconds', { duration_seconds: -1 }],
    ['duration_seconds', { duration_seconds: 1.5 }],
    ['duration_seconds', { duration_seconds: 86_401 }],
    ['note', { note: 'x'.repeat(2001) }],
  ])('refuses a bad %s', (field, patch) => {
    try {
      parseOrThrow(deviceCallInputSchema, { ...valid(), ...patch });
      throw new Error('expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
      const gql = error as GraphQLError;
      expect(gql.extensions.code).toBe('BAD_USER_INPUT');
      expect((gql.extensions.fields as Array<{ field: string }>).map((f) => f.field)).toContain(field);
    }
  });

  it('refuses a call starting in the future beyond clock drift', () => {
    const at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(() => parseOrThrow(deviceCallInputSchema, { ...valid(), started_at: at })).toThrow(/future/);
  });

  it('allows a few minutes of device clock drift', () => {
    const at = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    expect(() => parseOrThrow(deviceCallInputSchema, { ...valid(), started_at: at })).not.toThrow();
  });

  it('refuses a call older than a month', () => {
    const at = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(() => parseOrThrow(deviceCallInputSchema, { ...valid(), started_at: at })).toThrow(/31 days/);
  });
});

describe('deviceCallRecordingSchema', () => {
  const recording = { log_id: '64b000000000000000000001', recording_url: 'https://ik.imagekit.io/x/call.m4a', content_type: 'audio/mp4' };

  it('accepts an https audio file', () => {
    expect(parseOrThrow(deviceCallRecordingSchema, recording).content_type).toBe('audio/mp4');
  });

  it.each([
    ['log_id', { log_id: 'x' }],
    ['recording_url', { recording_url: 'http://ik.imagekit.io/x/call.m4a' }],
    ['recording_url', { recording_url: 'not a url' }],
    ['content_type', { content_type: 'video/mp4' }],
  ])('refuses a bad %s', (field, patch) => {
    expect(() => parseOrThrow(deviceCallRecordingSchema, { ...recording, ...patch })).toThrow(field);
  });
});

describe('timeline wording', () => {
  it.each([
    [0, '0s'],
    [59, '59s'],
    [60, '1m'],
    [134, '2m 14s'],
  ])('labels %d seconds as %s', (seconds, label) => {
    expect(durationLabel(seconds)).toBe(label);
  });

  it('describes a connected call with its length and a missed one with its outcome', () => {
    expect(timelineSummary({ direction: 'INBOUND', outcome: 'COMPLETED', duration_seconds: 134 })).toBe('Inbound call (2m 14s)');
    expect(timelineSummary({ direction: 'OUTBOUND', outcome: 'NO_ANSWER', duration_seconds: 0 })).toBe('Outbound call — no answer');
    expect(timelineSummary({ direction: 'OUTBOUND', outcome: 'BUSY', duration_seconds: 0 })).toBe('Outbound call — busy');
  });
});
