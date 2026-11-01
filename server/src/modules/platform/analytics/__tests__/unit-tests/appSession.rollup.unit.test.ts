import { Types } from 'mongoose';
import { sessionDeltas, sessionUpdate, type RollupEvent } from '../../appSession.rollup';

const member = new Types.ObjectId();

const event = (over: Partial<RollupEvent>): RollupEvent => ({
  session_id: 's1',
  device_id: 'd1',
  user_id: null,
  event_name: 'element_click',
  platform: 'android',
  app_version: '1.0.0',
  os_version: '15',
  device_type: 'phone',
  screen_name: '',
  occurred_at: new Date('2026-10-31T10:00:00Z'),
  ...over,
});

describe('sessionDeltas', () => {
  it('folds a batch into each session: span, counts, entry and exit screens', () => {
    const [delta] = sessionDeltas([
      event({ event_name: 'screen_view', screen_name: 'Explore', occurred_at: new Date('2026-10-31T10:05:00Z') }),
      event({ event_name: 'app_open', occurred_at: new Date('2026-10-31T10:00:00Z') }),
      event({ event_name: 'screen_view', screen_name: 'Home', occurred_at: new Date('2026-10-31T10:01:00Z') }),
      event({ event_name: 'element_click', occurred_at: new Date('2026-10-31T10:06:00Z') }),
    ]);
    expect(delta).toMatchObject({
      session_id: 's1',
      first: new Date('2026-10-31T10:00:00Z'),
      last: new Date('2026-10-31T10:06:00Z'),
      events: 4,
      screen_views: 2,
      clicks: 1,
      entry: { screen: 'Home', at: new Date('2026-10-31T10:01:00Z') },
      exit: { screen: 'Explore', at: new Date('2026-10-31T10:05:00Z') },
    });
  });

  it('gives the session to the member who signed in during it, and keeps known values over blanks', () => {
    const [delta] = sessionDeltas([
      event({ user_id: null, app_version: '1.0.0' }),
      event({ user_id: member, app_version: '' }),
      event({ user_id: null, platform: '' }),
    ]);
    expect(delta.user_id).toBe(member);
    expect(delta.app_version).toBe('1.0.0');
    expect(delta.platform).toBe('android');
  });

  it('keeps sessions apart, and leaves out events with no session', () => {
    const deltas = sessionDeltas([event({ session_id: 's1' }), event({ session_id: 's2' }), event({ session_id: '' })]);
    expect(deltas.map((delta) => delta.session_id)).toEqual(['s1', 's2']);
  });

  it('records no entry or exit for a session without screen views', () => {
    const [delta] = sessionDeltas([event({ event_name: 'app_open' })]);
    expect(delta.entry).toBeNull();
    expect(delta.exit).toBeNull();
  });
});

describe('sessionUpdate', () => {
  it('passes every client value through $literal, so a screen named like an operator stays text', () => {
    const [delta] = sessionDeltas([event({ event_name: 'screen_view', screen_name: '$where' })]);
    const [stage] = sessionUpdate(delta) as Array<{ $set: Record<string, unknown> }>;
    const entry = stage.$set.entry_screen as { $cond: unknown[] };
    expect(entry.$cond[1]).toEqual({ $literal: '$where' });
    expect(stage.$set.platform).toEqual({ $literal: 'android' });
  });

  it('adds the batch counts to what the session already holds, and recomputes its length', () => {
    const [delta] = sessionDeltas([event({}), event({})]);
    const [first, second] = sessionUpdate(delta) as Array<{ $set: Record<string, unknown> }>;
    expect(first.$set.events).toEqual({ $add: [{ $ifNull: ['$events', 0] }, 2] });
    expect(second.$set.duration_ms).toEqual({ $subtract: ['$ended_at', '$started_at'] });
  });

  it('keeps the stored entry and exit when the batch has no screen view', () => {
    const [delta] = sessionDeltas([event({ event_name: 'app_open' })]);
    const [stage] = sessionUpdate(delta) as Array<{ $set: Record<string, unknown> }>;
    expect(stage.$set.entry_screen).toEqual({ $ifNull: ['$entry_screen', ''] });
    expect(stage.$set.exit_at).toEqual({ $ifNull: ['$exit_at', null] });
  });
});
