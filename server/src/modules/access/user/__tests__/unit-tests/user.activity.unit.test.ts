/**
 * Admin > Users "Platforms Used" and "Last Activity" are written from each
 * signed-in request. These pin how a request is read as Android, iOS or Web,
 * how the in-memory throttle keeps that to one write per account and platform,
 * and what the write itself looks like. The database half is in
 * user.activity.int.test.ts.
 */
const mockUpdateOne = jest.fn();
jest.mock('../../user.model', () => ({ UserModel: { collection: { updateOne: mockUpdateOne } } }));
const mockWarn = jest.fn();
jest.mock('@observability/log', () => ({ logs: { server: { warn: mockWarn } } }));

import { Types } from 'mongoose';
import {
  ACTIVITY_WRITE_INTERVAL_MS,
  createActivityThrottle,
  flushUserActivity,
  platformFromRequest,
  toUserActivity,
  trackUserActivity,
} from '../../user.activity';

const request = (headers: Record<string, string | string[] | undefined>) => ({ headers });
const newId = () => new Types.ObjectId().toHexString();

describe('platformFromRequest', () => {
  it.each(['MWEB', 'PORTAL', 'ADMIN_PORTAL', 'WEBSITE', 'mweb'])('reads the %s browser surface as WEB', (surface) => {
    expect(platformFromRequest(request({ 'x-duncit-surface': surface }))).toBe('WEB');
  });

  it('reads a web surface as WEB even when it also names a phone platform', () => {
    expect(platformFromRequest(request({ 'x-duncit-surface': 'MWEB', 'x-duncit-platform': 'IOS' }))).toBe('WEB');
  });

  it('takes the first value when a proxy repeated the surface header', () => {
    expect(platformFromRequest(request({ 'x-duncit-surface': ['PORTAL', 'NATIVE'] }))).toBe('WEB');
  });

  it('names the native platform the app declares, in any case', () => {
    expect(platformFromRequest(request({ 'x-duncit-surface': 'NATIVE', 'x-duncit-platform': 'ANDROID' }))).toBe('ANDROID');
    expect(platformFromRequest(request({ 'x-duncit-surface': 'NATIVE', 'x-duncit-platform': 'ios' }))).toBe('IOS');
  });

  it('falls back to the HTTP stack for native builds from before the platform header', () => {
    const native = (agent: string) => request({ 'x-duncit-surface': 'NATIVE', 'user-agent': agent });
    expect(platformFromRequest(native('okhttp/4.12.0'))).toBe('ANDROID');
    expect(platformFromRequest(native('Duncit/112 CFNetwork/1568.100.1 Darwin/24.0.0'))).toBe('IOS');
  });

  it('reads the native web build, which runs in a browser, as WEB even on an Android phone', () => {
    const agent = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';
    expect(platformFromRequest(request({ 'x-duncit-surface': 'NATIVE', 'user-agent': agent }))).toBe('WEB');
  });

  it('ignores a declared platform it does not know and falls back to the user agent', () => {
    expect(
      platformFromRequest(request({ 'x-duncit-surface': 'NATIVE', 'x-duncit-platform': 'WINDOWS', 'user-agent': 'okhttp/4' }))
    ).toBe('ANDROID');
  });

  it('names no platform when a native request carries nothing recognisable', () => {
    expect(platformFromRequest(request({ 'x-duncit-surface': 'NATIVE', 'user-agent': 'curl/8.5.0' }))).toBeNull();
    expect(platformFromRequest(request({ 'x-duncit-surface': 'NATIVE' }))).toBeNull();
  });

  it('names no platform for a caller that is not a Duncit client', () => {
    expect(platformFromRequest(request({}))).toBeNull();
    expect(platformFromRequest(request({ 'x-duncit-surface': 'SERVER', 'x-duncit-platform': 'IOS' }))).toBeNull();
  });
});

describe('createActivityThrottle', () => {
  it('lets the first write through and holds the next one until the interval has passed', () => {
    const throttle = createActivityThrottle(1000, 10);
    expect(throttle.shouldWrite('a', 5000)).toBe(true);
    expect(throttle.shouldWrite('a', 5999)).toBe(false);
    expect(throttle.shouldWrite('a', 6000)).toBe(true);
  });

  it('throttles each key on its own', () => {
    const throttle = createActivityThrottle(1000, 10);
    expect(throttle.shouldWrite('user:IOS', 0)).toBe(true);
    expect(throttle.shouldWrite('user:WEB', 1)).toBe(true);
    expect(throttle.shouldWrite('user:IOS', 2)).toBe(false);
  });

  it('drops the key written longest ago once the bound is passed', () => {
    const throttle = createActivityThrottle(1000, 2);
    throttle.shouldWrite('a', 0);
    throttle.shouldWrite('b', 1);
    throttle.shouldWrite('a', 2000); // rewritten, so now newer than b
    throttle.shouldWrite('c', 2001);
    expect(throttle.size()).toBe(2);
    // b was evicted, so it writes again at once; a is still remembered.
    expect(throttle.shouldWrite('a', 2002)).toBe(false);
    expect(throttle.shouldWrite('b', 2003)).toBe(true);
  });

  it('forgets a key so the next request can retry straight away', () => {
    const throttle = createActivityThrottle(1000, 10);
    throttle.shouldWrite('a', 0);
    throttle.forget('a');
    expect(throttle.shouldWrite('a', 1)).toBe(true);
  });
});

describe('trackUserActivity', () => {
  beforeEach(() => mockUpdateOne.mockResolvedValue({ modifiedCount: 1 }));

  it('moves the last activity forward and adds the platform in one write', async () => {
    const id = newId();
    const at = new Date('2026-11-22T05:05:00.000Z');
    expect(trackUserActivity(id, 'ANDROID', at)).toBe(true);
    await flushUserActivity();
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(id) },
      { $max: { 'activity.last_at': at }, $addToSet: { 'activity.platforms': 'ANDROID' } }
    );
  });

  it('records only the time when the platform is unknown', async () => {
    const id = newId();
    const at = new Date('2026-11-22T05:05:00.000Z');
    trackUserActivity(id, null, at);
    await flushUserActivity();
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: new Types.ObjectId(id) }, { $max: { 'activity.last_at': at } });
  });

  it('writes once per account and platform per interval', async () => {
    const id = newId();
    const start = new Date('2026-11-22T05:00:00.000Z');
    const soon = new Date(start.getTime() + ACTIVITY_WRITE_INTERVAL_MS - 1);
    const later = new Date(start.getTime() + ACTIVITY_WRITE_INTERVAL_MS);
    expect(trackUserActivity(id, 'WEB', start)).toBe(true);
    expect(trackUserActivity(id, 'WEB', soon)).toBe(false);
    // Another platform is news straight away, so it is not held back.
    expect(trackUserActivity(id, 'IOS', soon)).toBe(true);
    expect(trackUserActivity(id, 'WEB', later)).toBe(true);
    await flushUserActivity();
    expect(mockUpdateOne).toHaveBeenCalledTimes(3);
  });

  it('never writes for an id that is not an account id', () => {
    expect(trackUserActivity('not-an-id', 'WEB')).toBe(false);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('logs a failed write instead of throwing, and lets the next request try again', async () => {
    const id = newId();
    const error = new Error('mongo down');
    mockUpdateOne.mockRejectedValueOnce(error);
    const at = new Date('2026-11-22T06:00:00.000Z');
    expect(trackUserActivity(id, 'IOS', at)).toBe(true);
    await flushUserActivity();
    expect(mockWarn).toHaveBeenCalledWith('userActivity', 'write failed', { error, user_id: id, platform: 'IOS' });
    expect(trackUserActivity(id, 'IOS', new Date(at.getTime() + 1))).toBe(true);
    await flushUserActivity();
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
  });
});

describe('toUserActivity', () => {
  it('reads an account with no activity yet as never seen, on no platform', () => {
    expect(toUserActivity(undefined)).toEqual({ last_activity_at: null, platforms_used: [] });
    expect(toUserActivity(null)).toEqual({ last_activity_at: null, platforms_used: [] });
    expect(toUserActivity({ last_at: null, platforms: null })).toEqual({ last_activity_at: null, platforms_used: [] });
  });

  it('gives the time as ISO text and the platforms in display order, dropping unknown values', () => {
    expect(
      toUserActivity({ last_at: new Date('2026-11-22T05:05:00.000Z'), platforms: ['WEB', 'TV', 'ANDROID'] })
    ).toEqual({ last_activity_at: '2026-11-22T05:05:00.000Z', platforms_used: ['ANDROID', 'WEB'] });
  });
});
