import { Types } from 'mongoose';
import { AppEventModel } from '../../appEvent.model';
import { AppSessionModel } from '../../appSession.model';
import { eventDocument, eventTime, ingestProductEvents } from '../../analytics.ingest';
import { redactText, safeProperties } from '../../analytics.privacy';
import type { ProductEventDTO } from '../../analytics.validator';

const NOW = new Date('2026-10-31T12:00:00Z');
const MINUTE = 60_000;

const dto = (over: Partial<ProductEventDTO> = {}): ProductEventDTO =>
  ({
    event_name: 'screen_view',
    client_event_id: 'c1',
    session_id: 's1',
    occurred_at: NOW.toISOString(),
    platform: 'android',
    screen_name: 'Home',
    ...over,
  }) as ProductEventDTO;

describe('redactText', () => {
  it('masks emails and runs of four or more digits, keeping short numbers', () => {
    expect(redactText('reach me at a@b.co or 9876543210, OTP 4821, 3 pods')).toBe('reach me at [email] or #, OTP #, 3 pods');
    expect(redactText(undefined)).toBe('');
  });
});

describe('safeProperties', () => {
  it('keeps plain values and drops nested ones', () => {
    expect(safeProperties(JSON.stringify({ results: 4, exact: true, page: null, filters: { a: 1 }, list: [1] }))).toEqual({
      results: 4,
      exact: true,
      page: null,
    });
  });

  it('never stores a secret-named property, nor a member’s own words — but keeps their length', () => {
    const json = JSON.stringify({ card_number: '4111', otp: '1234', message: 'hi', message_length: 2, user_email: 'x' });
    expect(safeProperties(json)).toEqual({ message_length: 2 });
  });

  it('redacts text values and caps the number of keys', () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(safeProperties(JSON.stringify(many)))).toHaveLength(20);
    expect(safeProperties(JSON.stringify({ query: 'yoga 98765 43210' }))).toEqual({ query: 'yoga # #' });
  });

  it('answers an empty object for anything that is not a JSON object', () => {
    expect(safeProperties('not json')).toEqual({});
    expect(safeProperties('[1,2]')).toEqual({});
    expect(safeProperties('')).toEqual({});
    expect(safeProperties(JSON.stringify({ 'bad key': 1, '9lives': 2 }))).toEqual({});
  });
});

describe('eventTime', () => {
  it('trusts the device clock within reason', () => {
    expect(eventTime(new Date(NOW.getTime() - 3 * MINUTE).toISOString(), NOW)).toEqual(new Date(NOW.getTime() - 3 * MINUTE));
    expect(eventTime(new Date(NOW.getTime() + 4 * MINUTE).toISOString(), NOW)).toEqual(new Date(NOW.getTime() + 4 * MINUTE));
  });

  it('stamps an event from a clock far ahead, or with no readable time, as now', () => {
    expect(eventTime(new Date(NOW.getTime() + 60 * MINUTE).toISOString(), NOW)).toBe(NOW);
    expect(eventTime('yesterday-ish', NOW)).toBe(NOW);
  });

  it('drops an event older than a week — a replay, not an offline backlog', () => {
    expect(eventTime(new Date(NOW.getTime() - 8 * 24 * 60 * MINUTE).toISOString(), NOW)).toBeNull();
  });
});

describe('eventDocument', () => {
  const identity = { device_id: 'd1', user_id: null };

  it('maps the taxonomy name onto the coarse kind the first clickstream used', () => {
    expect(eventDocument(dto({ event_name: 'screen_view' }), identity, NOW).event_type).toBe('PAGE_VIEW');
    expect(eventDocument(dto({ event_name: 'element_click' }), identity, NOW).event_type).toBe('CLICK');
    expect(eventDocument(dto({ event_name: 'element_impression' }), identity, NOW).event_type).toBe('IMPRESSION');
    expect(eventDocument(dto({ event_name: 'app_open' }), identity, NOW).event_type).toBe('EVENT');
  });

  it('redacts element text and keeps a believable foreground time only', () => {
    const doc = eventDocument(dto({ element_text: 'Pay 1499', element_name: 'Pay', duration_ms: 4_000 }), identity, NOW);
    expect(doc).toMatchObject({ target_text: 'Pay #', target_label: 'Pay', duration_ms: 4_000 });
    expect(eventDocument(dto({ duration_ms: 7 * 60 * 60 * 1000 }), identity, NOW).duration_ms).toBeNull();
  });

  it('keeps a real pod id and drops a malformed one', () => {
    const pod = new Types.ObjectId().toHexString();
    expect(String(eventDocument(dto({ pod_id: pod }), identity, NOW).pod_id)).toBe(pod);
    expect(eventDocument(dto({ pod_id: 'nope' }), identity, NOW).pod_id).toBeNull();
  });
});

describe('ingestProductEvents', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stores nothing for a caller with neither a device id nor an account', async () => {
    const write = jest.spyOn(AppEventModel, 'bulkWrite');
    await expect(ingestProductEvents({ events: [dto()], user_id: null, device_id: null, now: NOW })).resolves.toEqual({
      stored: 0,
      latest: null,
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('upserts by device and client id, and rolls up only the events that were new', async () => {
    const write = jest
      .spyOn(AppEventModel, 'bulkWrite')
      .mockResolvedValue({ upsertedIds: { 1: new Types.ObjectId() } } as never);
    const sessions = jest.spyOn(AppSessionModel, 'bulkWrite').mockResolvedValue({} as never);
    const result = await ingestProductEvents({
      events: [dto({ client_event_id: 'already-stored' }), dto({ client_event_id: 'fresh', session_id: 's9' })],
      user_id: null,
      device_id: 'd1',
      now: NOW,
    });
    expect(result.stored).toBe(1);
    const ops = write.mock.calls[0][0] as Array<{ updateOne: { filter: unknown; upsert: boolean } }>;
    expect(ops[0].updateOne).toMatchObject({ filter: { device_id: 'd1', client_event_id: 'already-stored' }, upsert: true });
    const rolled = sessions.mock.calls[0][0] as Array<{ updateOne: { filter: { session_id: string } } }>;
    expect(rolled.map((op) => op.updateOne.filter.session_id)).toEqual(['s9']);
  });

  it('falls back to the account as the device for a signed-in caller without one', async () => {
    const write = jest.spyOn(AppEventModel, 'bulkWrite').mockResolvedValue({ upsertedIds: {} } as never);
    const user = new Types.ObjectId().toHexString();
    await ingestProductEvents({ events: [dto()], user_id: user, device_id: null, now: NOW });
    const ops = write.mock.calls[0][0] as Array<{ updateOne: { filter: { device_id: string } } }>;
    expect(ops[0].updateOne.filter.device_id).toBe(`user:${user}`);
  });
});
