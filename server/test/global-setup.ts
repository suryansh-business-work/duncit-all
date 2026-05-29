import { MongoMemoryServer } from 'mongodb-memory-server';

// Starts ONE in-memory MongoDB for the whole project run (shared across all
// test files) — far cheaper and more reliable than booting a mongod per file.
export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  (globalThis as { __MONGOD__?: MongoMemoryServer }).__MONGOD__ = mongod;
}
