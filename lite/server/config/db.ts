import mongoose from 'mongoose';
import { env } from './env';
import { log } from '../utils/log';

/**
 * One connection to the Lite database. It is a separate database from every
 * main-stack one by construction: the URI is its own variable, and the name
 * defaults to `duncit-lite`.
 */
export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, env.mongoDbName ? { dbName: env.mongoDbName } : {});
  const name = mongoose.connection.db?.databaseName ?? env.mongoDbName;
  log.info('db', 'connect', { database: name });
  mongoose.connection.on('disconnected', () => log.warn('db', 'disconnected', {}));
  mongoose.connection.on('error', (error) => log.error('db', 'error', { error }));
}

export const dbState = (): string => {
  const states: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return states[mongoose.connection.readyState] ?? 'unknown';
};
