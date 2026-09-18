import { EventEmitter } from 'node:events';
import type { Connection } from 'mongoose';
import { dbConnectionEvents, recordDbEvent, watchDbConnection } from '../../dbConnectionLog';

describe('dbConnectionLog', () => {
  it('keeps events newest first with their message and attempt', () => {
    recordDbEvent('CONNECT_FAILED', 'querySrv ECONNREFUSED', 1);
    recordDbEvent('CONNECTED', null, 2);

    const [latest, previous] = dbConnectionEvents();
    expect(latest).toMatchObject({ kind: 'CONNECTED', message: null, attempt: 2 });
    expect(previous).toMatchObject({ kind: 'CONNECT_FAILED', message: 'querySrv ECONNREFUSED', attempt: 1 });
    expect(new Date(latest.at).toString()).not.toBe('Invalid Date');
  });

  it('defaults message and attempt to null', () => {
    recordDbEvent('CLOSED');
    expect(dbConnectionEvents()[0]).toMatchObject({ kind: 'CLOSED', message: null, attempt: null });
  });

  it('returns a copy, so a reader cannot change the log', () => {
    const copy = dbConnectionEvents();
    copy.length = 0;
    expect(dbConnectionEvents().length).toBeGreaterThan(0);
  });

  it('drops the oldest event beyond 200', () => {
    for (let i = 1; i <= 205; i += 1) recordDbEvent('RECONNECTED', null, i);
    const events = dbConnectionEvents();
    expect(events).toHaveLength(200);
    expect(events[0].attempt).toBe(205);
    expect(events[199].attempt).toBe(6);
  });

  it('records the driver lifecycle events, and subscribes only once', () => {
    const connection = new EventEmitter();
    watchDbConnection(connection as unknown as Connection);
    watchDbConnection(connection as unknown as Connection);

    connection.emit('disconnected');
    connection.emit('reconnected');
    connection.emit('close');
    connection.emit('error', new Error('connection 3 to duncit-mongo:27017 closed'));

    expect(connection.listenerCount('disconnected')).toBe(1);
    const kinds = dbConnectionEvents()
      .slice(0, 4)
      .map((e) => e.kind);
    expect(kinds).toEqual(['ERROR', 'CLOSED', 'RECONNECTED', 'DISCONNECTED']);
    expect(dbConnectionEvents()[0].message).toBe('connection 3 to duncit-mongo:27017 closed');
  });
});
