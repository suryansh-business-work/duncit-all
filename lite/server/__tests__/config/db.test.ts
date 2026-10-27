import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../../config/env';
import { connectDb, dbState } from '../../config/db';
import { log } from '../../utils/log';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, mongoUri: '', mongoDbName: '' } };
});

let server: MongoMemoryServer;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
});

afterEach(async () => {
  await mongoose.disconnect();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await server.stop();
});

describe('connectDb', () => {
  it('connects to the configured database name and logs it', async () => {
    Object.assign(env, { mongoUri: server.getUri(), mongoDbName: 'lite-db-check' });
    const info = vi.spyOn(log, 'info').mockImplementation(() => undefined);
    expect(dbState()).toBe('disconnected');

    await connectDb();

    expect(dbState()).toBe('connected');
    expect(mongoose.connection.db?.databaseName).toBe('lite-db-check');
    expect(info).toHaveBeenCalledWith('db', 'connect', { database: 'lite-db-check' });
  });

  it('uses the database named in the URI when no name is configured, and logs a disconnect', async () => {
    Object.assign(env, { mongoUri: server.getUri('lite-from-uri'), mongoDbName: '' });
    vi.spyOn(log, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);

    await connectDb();
    expect(mongoose.connection.db?.databaseName).toBe('lite-from-uri');

    await mongoose.disconnect();
    expect(dbState()).toBe('disconnected');
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('db', 'disconnected', {}), { timeout: 5000 });
  });
});
